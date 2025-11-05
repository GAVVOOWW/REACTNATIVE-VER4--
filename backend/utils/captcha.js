/**
 * Simple captcha middleware for verifying tokens
 * @returns {Function} Express middleware function
 */
export const captchaMiddleware = () => {
    return async (req, res, next) => {
        try {
            const { captcha } = req.body; // This is the one-time token
            
            // 1. Check if a captcha token was provided
            if (!captcha) {
                return res.status(400).json({
                    success: false,
                    message: 'Captcha verification is required'
                });
            }

            // 2. Check if the session is valid and contains verification data
            if (!req.session || !req.session.captchaToken || !req.session.captchaVerified) {
                console.log('Captcha verification failed: no session data found');
                return res.status(400).json({
                    success: false,
                    message: 'Captcha verification expired or invalid. Please verify again.'
                });
            }

            // 3. Validate the token and the verified flag
            if (req.session.captchaVerified && req.session.captchaToken === captcha) {
                console.log('Captcha verification passed');
                
                // Mark as used to prevent reuse
                delete req.session.captchaVerified;
                delete req.session.captchaToken;

                req.captchaData = {
                    success: true,
                    verified: true,
                    type: 'math-captcha'
                };
                return next();
            }

            // If token is invalid, reject
            console.log('Captcha verification failed: invalid token');
            return res.status(400).json({
                success: false,
                message: 'Captcha verification failed. Please try again.'
            });

        } catch (error) {
            console.error('Captcha verification error:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Captcha verification error'
            });
        }
    };
}; 