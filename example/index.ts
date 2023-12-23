import { Elysia } from 'elysia'
import { serverTiming } from '../src/index'

const delay = (time = 1000) => new Promise((r) => setTimeout(r, time))

const app = new Elysia()
    .trace(async ({ beforeHandle, handle, afterHandle, set }) => {
        await beforeHandle
        await handle
        await afterHandle

        set
    })
    .get('/', () => 'A', {
        beforeHandle: [
            async function a() {
                await delay(100)
                return 'a'
            }
        ],
        afterHandle: async () => {
            await delay(20)
        }
    })
    .listen(3000)

console.log(app.routes[0].composed!.toString())

const req = (path: string) => new Request(`http://localhost:8080${path}`)

const res = await app.handle(req('/'))
const timing = res.headers.get('Server-Timing')
console.log(timing)

// expect(timing).not.toBeNull()
