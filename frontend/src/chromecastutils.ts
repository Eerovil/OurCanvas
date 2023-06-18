
declare global {
    interface Window {
        __onGCastApiAvailable: any;
    }
}

const initializeCastApi = function () {
    try {
        // @ts-ignore
        cast.framework.CastContext.getInstance().setOptions({
            receiverApplicationId: '95C83BE3',
            // @ts-ignore
            autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
        });
    } catch (err) {
        console.log("error: ", err)
    }
};

export function initChromeCast() {
    // @ts-ignore
    window['__onGCastApiAvailable'] = function (isAvailable) {
        console.log("isAvailable: ", isAvailable)
        if (isAvailable) {
            setTimeout(() => {
                initializeCastApi();
            }, 500)
        }
    };
    setTimeout(() => {
        initializeCastApi();
    }, 5000)
}

export function initChromeCastReceiver() {
    // @ts-ignore
    const context = cast.framework.CastReceiverContext.getInstance();
    // @ts-ignore
    const options = new cast.framework.CastReceiverOptions();

    options.disableIdleTimeout = true;
    context.start(options);
}
