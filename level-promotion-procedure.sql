-- 等级提升存储过程
-- 在 Supabase SQL Editor 中执行

-- 创建存储过程来处理等级提升
CREATE OR REPLACE FUNCTION public.complete_level_promotion(
    p_qr_code_id UUID,
    p_user_id UUID,
    p_master_id UUID,
    p_current_level INTEGER,
    p_target_level INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_qr_code_exists BOOLEAN;
    v_level_log_id UUID;
BEGIN
    -- 1. 检查二维码是否存在且状态为未验证
    SELECT EXISTS(
        SELECT 1 FROM public.level_qr_codes 
        WHERE id = p_qr_code_id 
        AND user_id = p_user_id
        AND current_level = p_current_level
        AND target_level = p_target_level
        AND status = 'generated'
    ) INTO v_qr_code_exists;
    
    IF NOT v_qr_code_exists THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', '无效的二维码或二维码状态不正确'
        );
    END IF;
    
    -- 2. 不需要显式事务开始，PostgreSQL会自动处理
    -- 3. 更新二维码状态为已验证
    UPDATE public.level_qr_codes
    SET 
        status = 'verified',
        verified_at = NOW(),
        scanned_at = NOW()
    WHERE id = p_qr_code_id;
    
    -- 4. 创建等级提升记录
    INSERT INTO public.level_logs (
        user_id,
        old_level,
        new_level,
        verified_by,
        qr_code_id,
        status
    ) VALUES (
        p_user_id,
        p_current_level,
        p_target_level,
        p_master_id,
        p_qr_code_id,
        'verified'
    ) RETURNING id INTO v_level_log_id;
    
    -- 5. 更新用户等级（绕过RLS权限检查）
    UPDATE public.profiles
    SET 
        level = p_target_level,
        current_level = p_target_level,
        promotion_pending = false,
        last_promotion_at = NOW()
    WHERE id = p_user_id;
    
    -- 6. 不需要显式提交，PostgreSQL会自动提交
    
    RETURN jsonb_build_object(
        'ok', true,
        'level_log_id', v_level_log_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- 不需要显式回滚，PostgreSQL会自动回滚
        RETURN jsonb_build_object(
            'ok', false,
            'error', '等级提升失败: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.complete_level_promotion(
    UUID, UUID, UUID, INTEGER, INTEGER
) TO authenticated;

-- 创建检查等级提升状态的函数
CREATE OR REPLACE FUNCTION public.check_level_promotion_status(
    p_qr_code_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_qr_code public.level_qr_codes;
BEGIN
    -- 1. 检查二维码是否存在
    SELECT * INTO v_qr_code FROM public.level_qr_codes
    WHERE id = p_qr_code_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', '二维码不存在'
        );
    END IF;
    
    -- 2. 只根据二维码状态判断验证是否成功
    IF v_qr_code.status = 'verified' THEN
        RETURN jsonb_build_object(
            'status', 'verified',
            'user_id', v_qr_code.user_id,
            'current_level', v_qr_code.current_level,
            'target_level', v_qr_code.target_level
        );
    ELSE
        RETURN jsonb_build_object(
            'status', 'pending',
            'user_id', v_qr_code.user_id,
            'current_level', v_qr_code.current_level,
            'target_level', v_qr_code.target_level
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.check_level_promotion_status(
    UUID
) TO authenticated;
