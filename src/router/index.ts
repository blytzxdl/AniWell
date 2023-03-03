import Welcome from '@v/views/welcome/index.vue'
import Login from '@v/views/login/index.vue'
import Home from '@v/views/home/index.vue'
import Library from '@v/views/home/library/index.vue'
import Settings from '@v/views/home/settings/index.vue'
import VideoPlayer from '@v/views/videoPlayer/index.vue'
import * as VueRouter from 'vue-router'
import { reqIsFirst } from '@v/api'
import { proxyGlobalData, globalCache } from '@v/stores/global'

import { useSessionStorage } from '@vueuse/core'

const routes = [
    { path: '/', redirect: '/login' },
    {
        path: '/welcome',
        name: 'welcome',
        component: () => import('@v/views/welcome/index.vue'),
        beforeEnter: async (to, from) => {
            console.log('welcome!', to, from)
            const first = proxyGlobalData.first
            if (first === true) {
                return true
            } else if (first === false) {
                return false
            } else {
                return await reqIsFirst()
            }
        },
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@v/views/login/index.vue'),
        beforeEnter: (to, from) => {
            console.log('login!', to, from)
            if (from.path === '/welcome') {
                return true
            }
            if (
                sessionStorage.getItem('loggedIn') === 'true' &&
                sessionStorage.getItem('logout') !== 'true'
            ) {
                if (from.path === '/') {
                    return '/home'
                }
                return false
            } else return true
        },
    },
    {
        path: '/home',
        name: 'home',
        component: () => import('@v/views/home/index.vue'),
        children: [
            { path: '', redirect: '/home/library/video' },
            {
                path: 'library',
                name: 'library',
                component: Library,
                props: true,
                // children: [{ path: '', redirect: '' }]
            },
            {
                path: 'settings',
                name: 'settings',
                component: Settings,
            },
        ],
    },
    {
        path: '/videoPlayer',
        component: () => import('@v/views/videoPlayer/index.vue'),
    },
    {
        path: '/item',
        component: () => import('@v/views/item/index.vue'),
    },
]

const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes,
})

router.beforeEach(async (to, from) => {
    console.log('from', from.path, '>>>>>', 'to', to.path)
    if (globalCache.loggedIn) {
        return true
    } else {
        if (to.path === '/login') {
            return true
        } else return '/login'
    }
})

export default router
