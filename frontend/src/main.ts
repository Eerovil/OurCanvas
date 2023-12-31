import './style.css' // @ts-ignore
import * as PIXI from 'pixi.js-legacy'
import { initNetwork } from './socketUtils.ts'
import { UserDrawHandler } from './userDraw.ts';
import { DrawingsDisplay } from './othersDraw.ts';
import { Viewport } from 'pixi-viewport';
import { getGlobal } from './globals.ts';
import { initChromeCast, initChromeCastReceiver } from './chromecastutils.ts';


if (typeof console === "undefined") {
  (console as any) = {};
}


import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://cd94180401e04e13a95facd9478f813d@o4505339492433920.ingest.sentry.io/4505378816327680",
});


document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
`
function loadScript(src: string) {
  let script = document.createElement('script');
  script.src = src;
  const promise = new Promise((resolve) => {
    script.onload = resolve;
  })
  document.head.append(script);
  return promise;
}


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
  loading.style.flexDirection = 'column'
  loading.style.justifyContent = 'center'
  loading.style.alignItems = 'center'
  loading.style.fontSize = '1em'
  loading.style.fontWeight = 'bold'
  loading.style.color = 'black'
  const loadingText = document.createElement('div')
  loadingText.id = 'loading-text'
  loadingText.innerText = 'Ladataan...'
  loadingText.style.marginBottom = '20px'
  loading.appendChild(loadingText)

  loading.id = 'loading-screen'

  const progress = document.createElement('progress')
  progress.style.width = '50%'
  progress.style.height = '20px'
  progress.style.marginTop = '20px'
  progress.style.marginBottom = '20px'
  loading.appendChild(progress)

  document.body.appendChild(loading)
}

function setLoadProgress(progress: number, text: string | undefined = undefined) {
  const loading = document.querySelector<HTMLDivElement>('#loading-screen')!
  const progressBar = loading.querySelector<HTMLProgressElement>('progress')!
  progressBar.value = progress

  if (text) {
    const loadingText = loading.querySelector<HTMLDivElement>('#loading-text')!
    loadingText.innerText = text
  }
  console.log('progress', progress, text)
}

function dismissLoading() {
  document.body.removeChild(document.querySelector('#loading-screen')!)
}

async function main() {
  showLoading();
  setLoadProgress(0.1);
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

  // if (nickname == 'TV') {
  //   setLoadProgress(0.2, "Odotetaan...");
  //   setTimeout(() => {
  //     (window as any).debuggerConnected = true
  //   }, 60000)
  //   await new Promise((resolve) => {
  //     const checkOK = () => {
  //       if ((window as any).debuggerConnected) {
  //         resolve(null)
  //       }
  //       setTimeout(checkOK, 100)
  //     }
  //     checkOK()
  //   });
  // }

  setLoadProgress(0.2, "Yhdistetään...");
  const socketHandler = await initNetwork({
    fullDumpCallback: (data: FullDump) => {
      fullDump = data;
      Object.assign(globalStrokeMap, data.strokes);
      Object.assign(colors, data.colors)
      Object.assign(users, data.users)
      mapSize = data.mapSize;
      console.log('initial Full dump received')
    },
    nickname: nickname,
  })

  setLoadProgress(0.25, "Odotetaan yhteyttä...")
  await socketHandler.waitUntilConnected();

  setLoadProgress(0.3, "Odotetaan dataa...");
  await new Promise((resolve) => {
    setTimeout(resolve, 10)
  });

  await new Promise((resolve) => {
    const mapSizeIsSet = () => {
      if (mapSize) {
        console.log('map size is set')
        resolve(null)
      } else {
        console.log('map size is not set')
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

  setLoadProgress(0.4, "Luodaan piirtäjä...");
  await new Promise((resolve) => {
    setTimeout(resolve, 10)
  });

  const options: any = {
    width: mapSize[0],
    height: mapSize[1],
    backgroundColor: 0xffffff,
    autoStart: true,
    resolution: window.devicePixelRatio || 1,
    resizeTo: window,
  }

  if (nickname == 'TV') {
    options.forceCanvas = true
  }

  const pixiApp = new PIXI.Application(options);

  console.log('options', options)
  console.log('pixiApp', pixiApp)

  document.body.appendChild(pixiApp.view as unknown as HTMLElement)

  const isMobile = window.innerWidth < 1200;
  console.log('isMobile', isMobile)

  const renderer = pixiApp.renderer;
  const viewport = new Viewport({
    events: renderer.events,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: mapSize[0],
    worldHeight: mapSize[1],
  });
  console.log('viewport', viewport)

  // add the viewport to the stage
  pixiApp.stage.addChild(viewport)

  if (isMobile) {
    viewport
      .pinch()
      .drag()
    viewport.fitWorld(true);
    const scale = Math.min(window.innerWidth / mapSize[0], window.innerHeight / mapSize[1]);
    viewport.setZoom(scale / 2);
    viewport.x = 0;
    viewport.y = 0;
  } else {
    // Zoom out a bit
    console.log('zooming: mapSize', mapSize)
    viewport
      .drag()
      .wheel()

    const scale = Math.min(window.innerWidth / mapSize[0], window.innerHeight / mapSize[1]);
    viewport.setZoom(scale / 1.5);
    viewport.moveCenter(mapSize[0], mapSize[1]);
    viewport.x = 0
    viewport.y = 0
  }
  console.log(viewport);
  const drawingsDisplay = new DrawingsDisplay(viewport, renderer as PIXI.Renderer);

  socketHandler.partialDumpCallbacks.push((data: PartialDump) => {
    drawingsDisplay.handlePartialDump(data);
  })

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

  setLoadProgress(0.5, "Piirretään...");
  await new Promise((resolve) => setTimeout(resolve, 10))
  const totalStrokeCount = Object.keys(fullDump.strokes).length;
  let count = 0;
  for (const strokeId in fullDump.strokes) {
    const stroke = fullDump.strokes[strokeId];
    if (stroke.erase) {
      continue;
    }
    drawingsDisplay.preDrawDrawing(stroke)
    await new Promise((resolve) => setTimeout(resolve, 1))
    setLoadProgress(0.5 + 0.5 * count / totalStrokeCount);
    count++;
  }
  for (const strokeId in fullDump.strokes) {
    const stroke = fullDump.strokes[strokeId];
    if (stroke.erase) {
      continue;
    }
    const graphics = drawingsDisplay.progressDrawings.get(stroke.id);
    drawingsDisplay.childContainer.addChild(graphics!)
  }
  // pixiApp.ticker.add(() => {
  //   gameMap.updateAllEntities();
  // });
  setLoadProgress(1, "Valmis!");
  await new Promise((resolve) => setTimeout(resolve, 1000))
  dismissLoading();

  if (isMobile) {
    const viewX = Math.random() * (mapSize[0] - window.innerWidth) + window.innerWidth;
    const viewY = Math.random() * (mapSize[1] - window.innerHeight) + window.innerHeight;
    const scale = 0.8;
    setTimeout(() => {
      viewport.animate({
        time: 2000,
        position: new PIXI.Point(viewX, viewY),
        scale: scale,
        ease: 'easeInOutSine',
      })
      setTimeout(() => {
        viewport
          .clampZoom({
            minWidth: window.innerWidth,
            minHeight: window.innerHeight,
            maxWidth: mapSize[0] * 2,
            maxHeight: mapSize[1] * 2,
          })
      }, 2000)
    }, 500)
  }
}


// const isMobile = window.innerWidth < 1200;
// if (isMobile) {

//   initChromeCast();

// }
if (parseQueryParams()['nickname'] != 'TV') {
  loadScript('https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1').then(() => {
    initChromeCast();
  });
} else {
  loadScript('https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js').then(() => {
    initChromeCastReceiver();
  });
}

main();

