import './style.css' // @ts-ignore
import * as PIXI from 'pixi.js'
import { initNetwork } from './socketUtils.ts'
import { UserDrawHandler } from './userDraw.ts';
import { DrawingsDisplay } from './othersDraw.ts';
import { Viewport } from 'pixi-viewport';
import { getGlobal } from './globals.ts';
import { initChromeCast } from './chromecastutils.ts';


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

function showLoading() {
  const loading = document.createElement('div')
  loading.style.position = 'fixed'
  loading.style.top = '0'
  loading.style.left = '0'
  loading.style.width = '100vw'
  loading.style.height = '100vh'
  loading.style.backgroundColor = 'white'
  loading.style.zIndex = '1000'
  loading.style.display = 'flex'
  loading.style.justifyContent = 'center'
  loading.style.alignItems = 'center'
  loading.style.fontSize = '2em'
  loading.style.fontWeight = 'bold'
  loading.style.color = 'black'
  loading.innerText = 'Ladataan...'
  loading.id = 'loading-screen'
  document.body.appendChild(loading)
}

function dismissLoading() {
  document.body.removeChild(document.querySelector('#loading-screen')!)
}

async function main() {
  showLoading();
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
  global.mapSize = mapSize;
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

  // add the viewport to the stage
  pixiApp.stage.addChild(viewport)

  if (isMobile) {
    viewport
      .pinch({
        factor: 2,  // Faster pan
      })
      .decelerate()
      .clampZoom({
        minWidth: window.innerWidth,
        minHeight: window.innerHeight,
        maxWidth: mapSize[0],
        maxHeight: mapSize[1],
      })
      .clamp({
        left: 0,
        right: mapSize[0],
        top: 0,
        bottom: mapSize[1],
      })
    // Zoom in a bit
    viewport.scale.set(0.8);
    // Pan to a random location
    viewport.moveCorner(Math.random() * (mapSize[0] - window.innerWidth), Math.random() * (mapSize[1] - window.innerHeight));
  } else {
    // Zoom out a bit
    viewport
      .drag()
      .wheel()

    const scale = Math.min(window.innerWidth / mapSize[0], window.innerHeight / mapSize[1]);
    viewport.setZoom(scale / 1.5);
    viewport.moveCenter(mapSize[0], mapSize[1]);
    initChromeCast();
  }
  console.log(viewport);
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
  dismissLoading();
}

main()
