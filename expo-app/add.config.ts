// app.config.ts
import {ConfigContext} from "@expo/config"

export default ({config}: ConfigContext) => {
    config.extra = {
        ...config.extra,
        GOOGLE_MAP_API_KEY: process.env. GOOGLE_MAP_API_KEY,
    }
    return config;
};