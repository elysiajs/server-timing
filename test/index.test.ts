import { Elysia } from 'elysia'
import { serverTiming } from '../src'

import { describe, expect, it } from 'bun:test'

const req = (path: string) => new Request(`http://localhost:8080${path}`)

const delay = (time = 1000) => new Promise((r) => setTimeout(r, time))

const sampleResponse =
    'request;dur=59.336415999999986,request.0.init;dur=57.475874999999974,beforeHandle;dur=363.2004999999999,beforeHandle.0.a;dur=107.58562500000005,beforeHandle.1.b;dur=253.637875,handle.demo;dur=0.17795799999998962,afterHandle;dur=54.278625000000034,afterHandle.0.afterHandle;dur=54.18974999999989,total;dur=479.14762500000006'

describe('Server Timing', () => {
    it('report event to Server-Timing', async () => {
        const app = new Elysia()
            .use(serverTiming())
            .onRequest(async function init() {
                await delay(1)
            })
            .get(
                '/',
                function demo() {
                    return 'Server Timing'
                },
                {
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
                }
            )

        const res = await app.handle(req('/'))
        const timing = res.headers.get('Server-Timing')

        expect(timing).toContain('request;dur=')
        expect(timing).toContain('request.0.init;dur=')

        expect(timing).toContain('beforeHandle;dur=')
        expect(timing).toContain('beforeHandle.0.a;dur=')
        expect(timing).toContain('beforeHandle.1.b;dur=')

        expect(timing).toContain('handle.demo;dur=')

        expect(timing).toContain('afterHandle;dur=')
        expect(timing).toContain('afterHandle.0.afterHandle;dur=')

        expect(timing).toContain('total;dur=')
    })

    it('verifies handler metric formatting', async () => {
        const app = new Elysia()
            .use(serverTiming())
            .get('/', function demo() {
                return 'Server Timing'
            })

        const res = await app.handle(req('/'))
        const timing = res.headers.get('Server-Timing')

        expect(timing).not.toBeNull();

        const formattedTiming = (timing!).split(',').map(part => part.split(';'));

        expect(formattedTiming).toHaveLength(2);
        expect(formattedTiming[0][0]).toBe('handle.demo');
        expect(formattedTiming[0][1]).toMatch(/dur=\d+(\.\d+)?/);
        expect(formattedTiming[1][0]).toBe('total');
        expect(formattedTiming[1][1]).toMatch(/dur=\d+(\.\d+)?/);
    })

    it('verifies handler metric formatting without total', async () => {
        const app = new Elysia()
            .use(serverTiming({
                trace: {
                    total: false
                }
            }))
            .get('/', function demo() {
                return 'Server Timing'
            })

        const res = await app.handle(req('/'))
        const timing = res.headers.get('Server-Timing')

        expect(timing).not.toBeNull();

        const formattedTiming = (timing!).split(',').map(part => part.split(';'));

        expect(formattedTiming).toHaveLength(1);
        expect(formattedTiming[0][0]).toBe('handle.demo');
        expect(formattedTiming[0][1]).toMatch(/dur=\d+(\.\d+)?/);
    })

    it('exclude specified event', async () => {
        const app = new Elysia()
            .use(
                serverTiming({
                    trace: {
                        request: false,
                        beforeHandle: false,
                        total: false
                    }
                })
            )
            .onRequest(async function init() {
                await delay(1)
            })
            .get(
                '/',
                function demo() {
                    return 'Server Timing'
                },
                {
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
                }
            )

        const res = await app.handle(req('/'))
        const timing = res.headers.get('Server-Timing')

        expect(timing).not.toContain('request;dur=')
        expect(timing).not.toContain('request.0.init;dur=')

        expect(timing).not.toContain('beforeHandle;dur=')
        expect(timing).not.toContain('beforeHandle.0.a;dur=')
        expect(timing).not.toContain('beforeHandle.1.b;dur=')

        expect(timing).toContain('handle.demo;dur=')

        expect(timing).toContain('afterHandle;dur=')
        expect(timing).toContain('afterHandle.0.afterHandle;dur=')

        expect(timing).not.toContain('total;dur=')
    })

    it('respect allow', async () => {
        const app = new Elysia()
            .use(
                serverTiming({
                    allow: async ({ request }) => {
                        return new URL(request.url).pathname !== '/no-trace'
                    }
                })
            )
            .onRequest(async function init() {
                await delay(1)
            })
            .get(
                '/',
                function demo() {
                    return 'Server Timing'
                },
                {
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
                }
            )
            .get('/no-trace', () => 'hi')

        const res = await app.handle(req('/no-trace'))
        const timing = res.headers.get('Server-Timing')

        expect(timing).toBeNull()
    })

    // it('handle early exit on beforeHandle with afterHandle', async () => {
    //     const delay = (time = 1000) => new Promise((r) => setTimeout(r, time))

    //     const app = new Elysia()
    //         .use(serverTiming())
    //         .get('/', () => 'A', {
    //             beforeHandle: [
    //                 async function a() {
    //                     await delay(1)
    //                     return 'a'
    //                 }
    //             ],
    //             afterHandle: async () => {
    //                 await delay(1)
    //             }
    //         })
    //         .listen(3000)

    //     const res = await app.handle(req('/'))
    //     const timing = res.headers.get('Server-Timing')

    //     expect(timing).not.toBeNull()
    // })
})
