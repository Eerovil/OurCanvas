
class Global {
    colors: ColorMap = {};
    mapSize: number[] = [];
}

const global = new Global();

export function getGlobal(): Global {
    return global;
}
