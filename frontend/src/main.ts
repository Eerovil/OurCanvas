import './style.css' // @ts-ignore
import { initNetwork } from './socketUtils.ts'
import { Application } from 'pixi.js'
// import * as PIXI from 'pixi.js';
import { UserDrawHandler } from './userDraw.ts';


if(typeof console === "undefined"){
  (console as any) = {};
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="main-container">
    <div id="draw-element"></div>
  </div>
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
  const colors: ColorMap = {};
  const users: UserMap = {}
  let mapSize: number[];
  const isMobile = window.innerWidth < 600

  const pixiApp = new Application({
    resizeTo: window,
  });

  document.querySelector<HTMLCanvasElement>('#main-container')!.insertBefore(
    pixiApp.view as unknown as Node,
    document.querySelector<HTMLDivElement>('#draw-element')!,
  )

  let nickname: string = parseQueryParams()['nickname']

  if (!nickname && isMobile) {
    nickname = prompt('Kirjoita nimesi') || 'Anonymous'
  } else if (!isMobile) {
    nickname = 'TV'
  }
  setQueryParam('nickname', nickname);
  (window as any).nickname = nickname

  const socketHandler = await initNetwork({
    fullDumpCallback: (data: FullDump) => {
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

  let userId;
  for (const user of Object.values(users)) {
    if (user.name == nickname) {
      userId = user.id;
    }
  }
  if (!userId) {
    throw new Error("No user id")
  }

  const userDrawHandler = new UserDrawHandler(userId);
  userDrawHandler.startStrokeHandler = (x: number, y: number) => {
    socketHandler.startStroke(x, y);
  }
  userDrawHandler.continueStrokeHandler = (strokeId: number, points: StrokePoint[], lastOrder: number) => {
    socketHandler.continueStroke(strokeId, points, lastOrder);
  }
  socketHandler.partialDumpCallbacks.push((data: PartialDump) => {
    userDrawHandler.handlePartialDump(data);
  })
  const drawElement = document.querySelector<HTMLDivElement>('#draw-element')!

  drawElement.addEventListener('touchstart', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    userDrawHandler.mouseDownHandler(touch.clientX, touch.clientY)
  })

  drawElement.addEventListener('touchmove', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    userDrawHandler.mouseMoveHandler(touch.clientX, touch.clientY)
  })

  // pixiApp.ticker.add(() => {
  //   gameMap.updateAllEntities();
  // });
}

main()
