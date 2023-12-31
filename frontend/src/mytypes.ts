
type StrokePoint = {
    order: number,
    x: number,
    y: number,
}

type FullStroke = {
    id: number,
    points: StrokePoint[],
    color_id: number,
    pen_size: number,
    user_id: number,
    finished: boolean,
    erase?: boolean,
    deleted: boolean,
}

type FullStrokeMap = {
    [key: number]: FullStroke
}

type Color = {
    id: number,
    name: string,
    hex: string,
}

type ColorMap = {
    [key: number]: Color
}

type User = {
    id: number,
    name: string,
    x: number,
    y: number,
}

type UserMap = {
    [key: number]: User
}

type FullDump = {
    strokes: FullStrokeMap,
    users: UserMap,
    mapSize: number[],
    colors: ColorMap,
}

type PartialDump = {
    strokes: FullStrokeMap,
}
