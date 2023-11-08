import { Elysia } from 'elysia'
import { serverTiming } from '../src/index'

const delay = (time = 1000) => new Promise((r) => setTimeout(r, time))

const app = new Elysia()
    .use(serverTiming())
    .get('/', () => 'A', {
        beforeHandle: [
            async function a() {
                await delay(1)
                return 'a'
            }
        ],
        afterHandle: async () => {
            await delay(1)
        }
    })
    .listen(3000)

app.handle(new Request('http://localhost/'))
