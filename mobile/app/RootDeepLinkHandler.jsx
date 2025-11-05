import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from "@env";

const RootDeepLinkHandler = () => {
    const router = useRouter();

    useEffect(() => {
        const openSuccessOrCancel = (incomingUrl) => {
            if (!incomingUrl) return;
            const url = decodeURIComponent(incomingUrl);
            console.log('Deep link:', url);
            const [, query] = url.split('?');
            const params = Object.fromEntries(new URLSearchParams(query));

            // Handle both Paymongo success patterns
            if (url.includes('checkout/success') || url.includes('SuccessPage')) {
                router.replace({ pathname: 'SuccessPage', params });
            }
            // Handle both Paymongo cancel patterns
            else if (url.includes('checkout/cancel') || url.includes('CancelPage')) {
                router.replace({ pathname: 'CancelPage', params });
            }
        };

        // 1️⃣ Handle cold start
        Linking.getInitialURL().then(openSuccessOrCancel);

        // 2️⃣ Handle when the app is already running
        const sub = Linking.addEventListener('url', (e) =>
            openSuccessOrCancel(e.url)
        );
        return () => sub.remove();
    }, []);

    return null;      // this component renders nothing
};

export default RootDeepLinkHandler;
