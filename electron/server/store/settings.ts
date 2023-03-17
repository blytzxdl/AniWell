import path, { resolve } from 'path'
import paths from '@s/utils/envPath'
import Store from 'electron-store'
import throttle from 'lodash/throttle'
import { changeLevel, logger } from '@s/utils/logger'
import { accessSync } from 'fs'
const dev = Boolean(import.meta.env.DEV)

export interface Settings {
    server: {
        serverPort: number
        ffmpegPath: string
        tempPath: string
        cert: string
        key: string
        debug: boolean
        dev: boolean
    }
    transcode: {
        platform: string
        bitrate: number
        autoBitrate: boolean
        advAccel: boolean
        encode: string
        customInputCommand: string
        customOutputCommand: string
    }
}

const store = new Store({
    name: 'settings',
    cwd: paths.config,
    defaults: {
        server: {
            serverPort: 9009,
            ffmpegPath: '',
            tempPath: paths.temp,
            cert: resolve(paths.data, 'ssl', 'domain.pem'),
            key: resolve(paths.data, 'ssl', 'domain.key'),
            debug: false,
            dev: dev,
        },
        transcode: {
            platform: 'nvidia',
            bitrate: 5,
            autoBitrate: false,
            advAccel: true,
            encode: 'h264',
            customInputCommand: '',
            customOutputCommand: '',
        },
    },
})

const accessPath = (path) => {
    try {
        accessSync(path)
        return true
    } catch (error) {
        return false
    }
}

const settingsChecker = {
    serverPort: (v) => typeof v === 'number',
    ffmpegPath: (v) => accessPath(v),
    tempPath: (v) => accessPath(v),
    cert: (v) => accessPath(v),
    key: (v) => accessPath(v),
    debug: (v) => typeof v === 'boolean',
    dev: (v) => v === dev,
    platform: (v) => typeof v === 'string',
    bitrate: (v) => typeof v === 'number',
    autoBitrate: (v) => typeof v === 'boolean',
    advAccel: (v) => typeof v === 'boolean',
    encode: (v) => typeof v === 'string',
    customInputCommand: (v) => typeof v === 'string',
    customOutputCommand: (v) => typeof v === 'string',
}

const save = throttle(() => {
    store.clear()
    store.set(settings)
    logger.debug('newSettings saved', settings)
}, 500)

const settings = new Proxy(store.store, {
    get(target, key) {
        if (key === 'server' || key === 'transcode') {
            return new Proxy(Reflect.get(target, key), {
                get(target, key, reciver) {
                    if (key === 'dev') {
                        return dev
                    }
                    return Reflect.get(target, key)
                },
                set(target, key, value, reciver) {
                    let res
                    if (settingsChecker[key] == undefined) {
                        res = false
                    } else if (typeof key === 'string' && settingsChecker[key](value)) {
                        if (key === 'dev') {
                            res = Reflect.set(target, key, dev)
                        } else {
                            res = Reflect.set(target, key, value)
                        }
                        if (res && key === 'debug') {
                            changeLevel(value)
                        }
                    } else res = false
                    if (res === false) {
                        throw new TypeError('settings ' + key + ' error ' + value)
                    }
                    if (res === true) save()
                    return res
                },
            })
        } else return Reflect.get(target, key)
    },
    set(target, key, value) {
        if (!['server', 'transcode'].includes(key as string)) {
            return true
        }
        const res = Reflect.set(target, key, value)
        if (res === true) save()
        return res
    },
})

changeLevel(settings.server.debug)

export default settings
