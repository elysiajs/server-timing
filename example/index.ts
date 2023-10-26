import { Elysia } from 'elysia'
import { serverTiming } from '../src/index'

const delay = (time = 1000) => new Promise((r) => setTimeout(r, time))

const app = new Elysia()
    .use(
        serverTiming({
            allow: ({ request }) => {
                return new URL(request.url).pathname !== '/no-trace'
            }
        })
    )
    .onRequest(async function init() {
        await delay(50)
    })
    .get(
        '/',
        function demo() {
            return 'Server Timing'
        },
        {
            beforeHandle: [
                async function a() {
                    await delay(100)
                },
                async function b() {
                    await delay(250)
                }
            ],
            async afterHandle() {
                await delay(50)
            }
        }
    )
    .get('/no-trace', () => 'hi')
    .listen(3000)
