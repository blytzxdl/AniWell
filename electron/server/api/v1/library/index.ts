import express from 'express'
import fs from 'fs'
import path, { join, resolve } from 'path'
import init from '@s/utils/init'
import { getFileType, searchLeaf } from '@s/utils'
import { encode, decode } from 'js-base64'
import { access, stat } from 'fs/promises'
import videoHandler from './handler/video'
import library from '@s/store/library'
import compression from 'compression'
import { logger } from '@s/utils/logger'
import paths from '@s/utils/envPath'

const router = express.Router()

router.use('/', async (req, res, next) => {
    // console.log(req.path, req.query)
    next()
})

router.get('/old', (req, res, next) => {})

router.get('/:catagory', compression(), (req, res, next) => {
    try {
        const catagory = req.params?.catagory
        const reqPath = req.query.itemId
        const range = req.query.range
        if (typeof range === 'string') {
            var start = Number(range.split(',')[0])
            var end = Number(range.split(',')[1])
        }

        const library = JSON.parse(fs.readFileSync(path.resolve(init.libraryIndexPath)).toString())
        // console.log(catagory, resolve(decode(reqPath)))
        if (typeof catagory === 'string') {
            if (catagory === 'video' && !reqPath) {
                library.total = library.children.length
                const result = []
                for (; start < end && start < library.children.length; start++) {
                    const element = library.children[start]
                    result.push(element)
                }
                library.children = result
                library.start = start
                library.pageSize = library.children.length
                res.send(library)
                return
            }
            const search = searchLeaf(library, resolve(decode(reqPath)))
            if (search) {
                search.children.sort((a, b) => {
                    const n = a.episode - b.episode
                    if (n) {
                        return n
                    }
                    if (a.children && b.children) {
                        return 0
                    }
                    if (a.children) {
                        return -1
                    }
                    if (b.children) {
                        return 1
                    }
                    return 0
                })
                search.total = search.children.length
                const result = []
                for (; start < end && start < search.children.length; start++) {
                    const element = search.children[start]
                    result.push(element)
                }
                search.children = result
                search.start = start
                search.pageSize = search.children.length
                res.send(search)
            } else {
                res.status(404).json({ message: '不存在' })
            }
        } else {
            res.status(400).json({ message: '参数错误' })
        }
    } catch (error) {
        res.status(404).json({ message: '未建立媒体库' })
    }
})

//文件请求处理
router.use('/poster', async (req, res, next) => {
    let filePath
    if (req.query?.path) {
        filePath = path.resolve(req.query.path as string)
    } else {
        res.status(404).json({})
        return
    }
    if ((await getFileType(filePath)) === 'image') {
        try {
            //貌似是static自带了etag缓存
            // const ifModifiedSince = req.headers['if-modified-since']
            // const mtime = (await stat(filePath)).mtime.toUTCString()
            // if (mtime === ifModifiedSince) {
            //     res.status(304).end()
            // } else {
            res
                // .header('Cache-Control', `no-cache`)
                // .header('Last-Modified', mtime)
                .sendFile(path.resolve(filePath))
            // }
            return
        } catch (error) {
            res.status(404).json({})
            return
        }
    }
})

interface itemQuery {
    itemId?: string
    filePath?: string
    UID: string
}
router.post('/item', async (req, res, next) => {
    logger.info('/item', req.body)
    const itemId = req.body.itemId
    let target
    const getItemInfo = (itemId: string) => {}
    if (typeof itemId === 'string') {
        target = getItemInfo(itemId)
    }

    const itemPath = resolve(req.body.filePath)
    const itemType = await getFileType(itemPath)

    if (typeof itemType === 'string') {
        try {
            // let handler
            // if (vi) {
            //     handler = vi
            // } else {
            //     handler = (await import(`./handler/video`)).default
            // }
            // console.log('1')
            if (itemType === 'video') {
                await videoHandler(req, res, next)
                console.log('2')
                return
            } else return res.status(500).json({ message: '无对应处理程序' })
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: '无对应处理程序' })
        }
    } else {
        res.status(400).json({ message: '参数错误' })
    }
})
export default router
