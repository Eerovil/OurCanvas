
declare global {
    interface Window {
        __onGCastApiAvailable: any;
    }
}

const initializeCastApi = function () {
    // @ts-ignore
    cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: '620DFA9A',
        // @ts-ignore
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });
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
}