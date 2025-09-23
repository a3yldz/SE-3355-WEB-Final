// app/utils/config.ts

import { Platform } from 'react-native';

// Android emülatörü için, bilgisayarınızın localhost'una erişim sağlayan özel IP
const androidApiUrl = 'http://10.0.2.2:8080'; 

// Diğer tüm platformlar (iOS simülatörü, web, fiziksel cihazlar) için bilgisayarınızın yerel ağ IP'si veya localhost
// Bilgisayarınızın IP'sini öğrenmek için terminalde `ipconfig` (Windows) veya `ifconfig` (Mac/Linux) komutunu kullanabilirsiniz.
// Örneğin: const localNetworkApiUrl = 'http://192.168.1.5:8080';
const defaultApiUrl = 'http://localhost:8080';

// Platforma göre doğru URL'yi seç ve dışa aktar
export const BASE_URL = Platform.OS === 'android' ? androidApiUrl : defaultApiUrl;