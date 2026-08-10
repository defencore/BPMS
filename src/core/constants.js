export const HEADER_SERIAL = 0x5A;

export const COMMANDS = Object.freeze({
    SET_USERNAME: 0x41,
    SET_USER_ID: 0x42,
    SET_MAX_PRESSURE: 0x43,
    SET_DEVICE_TIME: 0x4F,
    HANDSHAKE: 0x52,
    GET_STATUS: 0x53,
    GET_RECORD: 0x54,
    GET_USERNAME: 0x55,
    GET_USER_ID: 0x56,
    CLEAR_RECORDS: 0x57,
    WIFI_SET_ROUTER: 0xA0,
    WIFI_SET_INTERVAL: 0xA1,
    WIFI_SET_SERVER: 0xA2,
    WIFI_SET_IP: 0xA3,
    WIFI_GET_IP: 0xA4,
    WIFI_SET_AP_SSID: 0xA5,
    WIFI_GET_MAC: 0xA6,
    WIFI_RESET: 0xA7,
    WIFI_SET_STA_MODE: 0xA8,
    WIFI_SET_SLEEP: 0xAF,
    GET_DEVICE_CODE: 0xC5,
    SET_BLIND_MEASURE: 0xCC
});

export const DEVICE_BODY_POSITIONS = Object.freeze({
    0x00: 'lying',
    0x01: 'sitting-standing',
    0x02: 'light-motion',
    0x03: 'physical-activity'
});

export const DEVICE_BODY_POSITION_CODES = Object.freeze(
    Object.fromEntries(Object.entries(DEVICE_BODY_POSITIONS).map(([code, name]) => [name, Number(code)]))
);

export const ERROR_CODES = Object.freeze({
    0x00: 'none',
    0x0F: 'interrupted',
    0x10: 'movement',
    0x20: 'cuff-pressure'
});
