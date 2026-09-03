import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const key = url.searchParams.get('key')

    if (!key || key.trim() === '') {
      return new Response(
        JSON.stringify({ valid: false, message: 'Thiếu license key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabase
      .from('mamnonpro_licenses')
      .select('*')
      .eq('key', key.trim())
      .single()

    if (error || !data) {
      return new Response(
        JSON.stringify({ valid: false, message: '🔑 Key không tồn tại. Liên hệ hỗ trợ.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const now = new Date()
    const expiry = new Date(data.expiry_date)
    const isExpired = expiry < now
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const isValid = data.is_active && !isExpired

    // Track thời điểm validate gần nhất
    await supabase
      .from('mamnonpro_licenses')
      .update({ last_validated_at: new Date().toISOString() })
      .eq('key', key.trim())

    let message = 'OK'
    if (!data.is_active) {
      message = '🔒 Tài khoản đã bị khóa. Liên hệ 0909.xxx.xxx để biết thêm.'
    } else if (isExpired) {
      message = `⏰ License hết hạn ngày ${data.expiry_date}. Vui lòng liên hệ gia hạn!`
    } else if (daysLeft <= 30) {
      message = `⚠️ License sắp hết hạn trong ${daysLeft} ngày (${data.expiry_date})`
    }

    return new Response(
      JSON.stringify({
        valid: isValid,
        schoolName: data.school_name,
        contactName: data.contact_name,
        plan: data.plan,
        maxClasses: data.max_classes,
        expiryDate: data.expiry_date,
        daysLeft: isExpired ? 0 : Math.max(0, daysLeft),
        isExpired,
        isNearExpiry: !isExpired && daysLeft <= 30,
        message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, message: 'Lỗi server. Vui lòng thử lại sau.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
