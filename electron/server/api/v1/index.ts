import { logger } from '@s/utils/logger'
import express from 'express'
const router = express.Router()
import users from './users'
import library from './library'
import auth from '@s/modules/auth'
import { signAccessToken, verifyToken } from '@s/utils/jwt'
import { users as usersStore } from '@s/store/users'
import path from 'path'

router.use('/', async (req, res, next) => {
    if (/^\/users\/(login|salt|first)/.test(req.path)) {
        next()
    } else {
        const { refreshToken, accessToken } = req.cookies
        const refreshTokenInfo = verifyToken(refreshToken)
        // const accessTokenInfo = verifyToken(accessToken)
        if (refreshTokenInfo === false) {
            res.status(401).json({ error: '/v1 令牌错误' })
            return
        } else {
            const user = usersStore.getUser({ UID: refreshTokenInfo.UID })
            if (user === false) {
                res.status(401).json({ error: '令牌或用户错误' })
                return
            }
            // if (accessTokenInfo === false) {
            //     res.cookie('accessToken', signAccessToken(user), {
            //         maxAge: 1000 * 60,
            //         httpOnly: true,
            //         secure: true,
            //     })
            // }
            if (auth.isAdmin({ UID: user.UID }) === true) {
                next()
            } else {
                res.status(401).json({ error: '权限错误' })
            }
        }
    }
})

router.use('/users', users)

router.use('/server', async (req, res, next) => {
    next()
})

router.use('/video', async (req, res, next) => {
    console.log(req.path)
    if (req.path === '/test.mp4') {
        const directPlayHandler = await import('@s/modules/handleVideoRequest/directPlayHandler')
        return directPlayHandler.default
            .init({
                filePath: path.resolve(''),
            })
            .directPlay(req, res)
    }
    // next()
})

router.use('/library', library)

export default router
