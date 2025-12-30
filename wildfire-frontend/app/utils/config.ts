import { Platform } from 'react-native';

const androidApiUrl = 'http://10.0.2.2:8000';

const defaultApiUrl = 'http://localhost:8000';

export const BASE_URL = Platform.OS === 'android' ? androidApiUrl : defaultApiUrl;