
type StrokePoint = {
    order: number,
    x: number,
    y: number,
}

type FullStroke = {
    id: number,
    points: StrokePoint[],
    color: number,
    pen_size: number,
    user_id: number,
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
