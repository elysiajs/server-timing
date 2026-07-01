import { Elysia } from 'elysia'
import { serverTiming } from '../src/index'

const delay = (time = 1000) => new Promise((r) => setTimeout(r, time))

const app = new Elysia()
    .use(serverTiming())
    .request(async function init() {
        await delay(1)
    })
    .get('/', {
        beforeHandle: [
            async function a() {
                await delay(1)
            },
            async function b() {
                await delay(1)
            }
        ],
        async afterHandle() {
            await delay(1)
        }
    }, function demo() {
        return 'Server Timing'
    })
    .listen(3000)

// console.log(app.routes[0].composed?.toString())

const req = (path: string) => new Request(`http://localhost:8080${path}`)

app.handle(req('/'))

// const timing = res.headers.get('Server-Timing')
// console.log(timing)

// expect(timing).not.toBeNull()
