
class Global {
    colors: ColorMap = {};
}

const global = new Global();

export function getGlobal(): Global {
    return global;
}
