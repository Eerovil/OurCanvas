import './style.css' // @ts-ignore
import * as PIXI from 'pixi.js'
import { initNetwork } from './socketUtils.ts'
import { UserDrawHandler } from './userDraw.ts';
import { DrawingsDisplay } from './othersDraw.ts';
import { Viewport } from 'pixi-viewport';
import { getGlobal } from './globals.ts';


if (typeof console === "undefined") {
  (console as any) = {};
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
`


function parseQueryParams() {
  const params = new URLSearchParams(window.location.search)
  const ret: { [key: string]: string } = {}
  for (const [key, value] of params.entries()) {
    ret[key] = value
  }
  return ret
}

function setQueryParam(key: string, value: string) {
  const url = new URL(window.location.href)
  url.searchParams.set(key, value)
  window.history.replaceState({}, '', url.toString())
}

async function main() {
  (window as any).spritesDrawn = 0
  const globalStrokeMap: FullStrokeMap = {}
  const global = getGlobal();
  const colors: ColorMap = global.colors;
  const users: UserMap = {}
  let mapSize: number[];

  let nickname: string = parseQueryParams()['nickname']

  // if (!nickname) {
  //   nickname = prompt('Kirjoita nimesi') || 'Anonymous'
  // }
  // Randomize nickname
  if (!nickname) {
    nickname = 'Anonymous' + Math.floor(Math.random() * 10000)
  }
  setQueryParam('nickname', nickname);
  (window as any).nickname = nickname

  let fullDump: FullDump;

  const socketHandler = await initNetwork({
    fullDumpCallback: (data: FullDump) => {
      fullDump = data;
      Object.assign(globalStrokeMap, data.strokes);
      Object.assign(colors, data.colors)
      Object.assign(users, data.users)
      mapSize = data.mapSize;
    },
    nickname: nickname,
  })

  await new Promise((resolve) => {
    const mapSizeIsSet = () => {
      if (mapSize) {
        resolve(null)
      } else {
        setTimeout(mapSizeIsSet, 100)
      }
    }
    mapSizeIsSet()
  })
  mapSize = mapSize!
  fullDump = fullDump!

  let userId;
  for (const user of Object.values(users)) {
    if (user.name == nickname) {
      userId = user.id;
    }
  }
  if (!userId) {
    throw new Error("No user id")
  }

  const pixiApp = new PIXI.Application({
    width: mapSize[0],
    height: mapSize[1],
    backgroundColor: 0xffffff,
    resolution: window.devicePixelRatio || 1,
    resizeTo: window,
    autoStart: true,
  });

  document.body.appendChild(pixiApp.view as unknown as HTMLElement)

  const isMobile = window.innerWidth < 600;

  const renderer = pixiApp.renderer;
  const viewport = new Viewport({
    events: renderer.events,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: mapSize[0],
    worldHeight: mapSize[1],
  });

  if (isMobile) {
    // Zoom in a bit
    viewport.scale.set(1.5);
  } else {
    // Zoom out a bit
    viewport.scale.set(0.5);
  }

  // add the viewport to the stage
  pixiApp.stage.addChild(viewport)
  viewport
    .pinch()
    .wheel()
    .decelerate()

  const drawingsDisplay = new DrawingsDisplay(viewport, renderer as PIXI.Renderer);

  socketHandler.partialDumpCallbacks.push((data: PartialDump) => {
    drawingsDisplay.handlePartialDump(data);
  })
  drawingsDisplay.handleFullDump(fullDump)

  const userDrawHandler = new UserDrawHandler(userId, viewport);
  userDrawHandler.startStrokeHandler = (x: number, y: number, penSize: number, colorId: number, erase: boolean) => {
    socketHandler.startStroke(x, y, penSize, colorId, erase);
  }
  userDrawHandler.continueStrokeHandler = (strokeId: number, points: StrokePoint[]) => {
    socketHandler.continueStroke(strokeId, points);
  }
  userDrawHandler.finishStrokeHandler = (strokeId: number) => {
    socketHandler.finishStroke(strokeId);
  }
  socketHandler.partialDumpCallbacks.push((data: PartialDump) => {
    userDrawHandler.handlePartialDump(data);
  })

  // pixiApp.ticker.add(() => {
  //   gameMap.updateAllEntities();
  // });
}

main()
