import {
    Elysia,
    type Context,
    type TraceEvent,
    type TraceProcess,
    type TraceStream
} from 'elysia'

type MaybePromise<T> = T | Promise<T>

export interface ServerTimingOptions {
    /**
     * Allow Server Timing to log specified life-cycle events
     */
    trace?: {
        /**
         * Capture duration from request
         *
         * @default true
         */
        request?: boolean
        /**
         * Capture duration from parse
         *
         * @default true
         */
        parse?: boolean
        /**
         * Capture duration from transform
         *
         * @default true
         */
        transform?: boolean
        /**
         * Capture duration from beforeHandle
         *
         * @default true
         */
        beforeHandle?: boolean
        /**
         * Capture duration from handle
         *
         * @default true
         */
        handle?: boolean
        /**
         * Capture duration from afterHandle
         *
         * @default true
         */
        afterHandle?: boolean
        /**
         * Capture total duration from start to finish
         *
         * @default true
         */
        total?: boolean
    }
    /**
     * Determine whether or not Server Timing should be enabled
     *
     * @default NODE_ENV !== 'production'
     */
    enabled?: boolean
    /**
     * A condition whether server timing should be log
     *
     * @default undefined
     */
    allow?:
        | MaybePromise<boolean>
        | ((context: Omit<Context, 'path'>) => MaybePromise<boolean>)
}

const iterate = async (
    event: TraceEvent,
    process: Promise<TraceProcess<'begin'>>
) => {
    let label = ''

    const { skip, time, end, children } = await process
    if (skip || !children.length) return ''

    for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const { name, time, end, skip } = await child

        if (skip) continue

        label += `${event}.${i}.${name};dur=${(await end) - time},`
    }

    label = `${event};dur=${(await end) - time},` + label

    return label
}

export const serverTiming = (options: ServerTimingOptions = {}) => {
    const app = new Elysia()

    const {
        allow,
        enabled = process.env.NODE_ENV !== 'production',
        trace: {
            request: traceRequest = true,
            parse: traceParse = true,
            transform: traceTransform = true,
            beforeHandle: traceBeforeHandle = true,
            handle: traceHandle = true,
            afterHandle: traceAfterHandle = true,
            total: traceTotal = true
        } = {}
    } = options

    if (enabled) {
        app.trace(
            async ({
                request,
                parse,
                transform,
                beforeHandle,
                handle,
                afterHandle,
                set,
                context,
                context: {
                    request: { method }
                }
            }) => {
                let label = ''

                const { time: requestStart } = traceTotal
                    ? await request
                    : { time: 0 }

                if (traceRequest) label += await iterate('request', request)

                if (traceParse && method !== 'GET' && method !== 'HEAD')
                    label += await iterate('parse', parse)

                if (traceTransform)
                    label += await iterate('transform', transform)

                if (traceBeforeHandle)
                    label += await iterate('beforeHandle', beforeHandle)

                const { end, time, skip, name } = await handle
                if (!skip) label += `handle.${name};dur=${(await end) - time}`

                if (traceAfterHandle)
                    label += await iterate('afterHandle', afterHandle)

                if (traceTotal) {
                    const { end: requestEnd } = await afterHandle

                    label += `total;dur=${(await requestEnd) - requestStart}`
                }

                set.headers['Server-Timing'] = label

                let allowed = allow
                if (allowed instanceof Promise) allowed = await allowed

                // ? Must wait until request is reported
                switch (typeof allowed) {
                    case 'boolean':
                        if (allowed === false)
                            delete set.headers['Server-Timing']

                        break

                    case 'function':
                        if ((await allowed(context)) === false)
                            delete set.headers['Server-Timing']

                        break
                }
            }
        )
    }

    return app
}

export default serverTiming
