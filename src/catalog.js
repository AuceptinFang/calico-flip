const REMOTE_REPO = 'aCalico24/Calico-Stickers'
const REMOTE_REF = 'main'
const REMOTE_DIR = '/三花/'
const REMOTE_MANIFEST_URL = `https://data.jsdelivr.com/v1/package/gh/${REMOTE_REPO}@${REMOTE_REF}/flat`
const REMOTE_CDN_BASE = `https://cdn.jsdelivr.net/gh/${REMOTE_REPO}@${REMOTE_REF}/`
const REMOTE_CACHE_NAME = 'calico-stickers-remote-v2'
const REMOTE_MANIFEST_KEY = 'calico-stickers-remote-manifest-v2'
const REMOTE_FETCH_TIMEOUT = 10000
const LOCAL_CATS_PREFIX = '/assets/cats/'

let catalogPromise = null

const LOCAL_FALLBACKS = [
  { name: '无语',       file: 'wuyu.jpg' },
  { name: '豹笑',       file: 'baoxiao.png' },
  { name: '问号',       file: 'wenhao.jpg' },
  { name: '问号2',      file: 'wenhao2.jpg' },
  { name: '投降',       file: 'touxiang.png' },
  { name: '猫皇帝',     file: 'maohuangdi.jpg' },
  { name: '猫皇帝无语', file: 'maohuangdi-wuyu.jpg' },
  { name: '送花',       file: 'songhua.jpg' },
  { name: '咸鱼',       file: 'xianyu.jpg' },
  { name: '名侦探',     file: 'mingzhentang.png' },
  { name: '初始',       file: 'chushi.jpg' },
  { name: '入眠',       file: 'rumian.jpg' },
  { name: '大犇',       file: 'daben.jpg' },
  { name: '很坏吗',     file: 'henhuaima.jpg' },
  { name: '的确坏',     file: 'diquehuai.png' },
  { name: '注意坏猫',   file: 'zhuyihuaimao.png' },
  { name: '添乱',       file: 'tianluan.jpg' },
  { name: '吃白饭',     file: 'chibaifan.png' },
  { name: '地铁老猫',   file: 'ditielaomao.jpg' },
  { name: '目移',       file: 'muyi.jpg' },
  { name: '蒟蒻',       file: 'juuruo.jpg' },
  { name: '思维升华1',  file: 'siweishenghua1.jpg' },
  { name: '思维升华2',  file: 'siweishenghua2.jpg' },
  { name: '何罪之有',   file: 'hezuizhiyou.jpg' },
  { name: '命也是命',   file: 'mingyeshiming.jpg' },
  { name: '别玩洗衣机', file: 'biewannaxiyijile.jpg' },
  { name: '笔自己写',   file: 'bizijixiezuoye.jpg' },
  { name: '萝卜纸巾',   file: 'luobozhijin.png' },
  { name: '讲坛眯眼',   file: 'yinhuajiangtan-miyan.jpg' },
  { name: '讲坛睁眼',   file: 'yinhuajiangtan-zhengyan.jpg' },
  { name: 'V50',        file: 'v50.png' },
  { name: '自定义文本', file: 'zidingywenben.png' },
]

const DISPLAY_NAME_ALIASES = {
  '想当咸鱼': '咸鱼',
  '猫皇帝_无语': '猫皇帝无语',
  '三花的命也是命': '命也是命',
  '别玩你那洗衣机了': '别玩洗衣机',
  '笔自己写作业': '笔自己写',
  '地铁老猫手机': '地铁老猫',
  '印花讲坛_眯眼': '讲坛眯眼',
  '印花讲坛_睁眼': '讲坛睁眼',
}

export const MAX_LIVES = 10
export const BOARD_PAIRS = 8

const IMAGE_EXT_RE = /\.(avif|bmp|gif|jpe?g|png|webp|svg)$/i

function shuffle(arr) {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/')
}

function timeoutSignal(ms) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ms)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  }
}

function localUrl(file) {
  return `${LOCAL_CATS_PREFIX}${file}`
}

function cdnUrl(path) {
  return `${REMOTE_CDN_BASE}${encodePath(path.replace(/^\/+/, ''))}`
}

function nameFromPath(path) {
  const file = path.split('/').pop() || path
  return file.replace(/\.[^.]+$/, '')
}

function displayNameFromPath(path) {
  const rawName = nameFromPath(path)
  return DISPLAY_NAME_ALIASES[rawName] || rawName
}

function comparePath(a, b) {
  return a.localeCompare(b, 'zh-Hans-CN')
}

function readStoredManifest() {
  try {
    const raw = localStorage.getItem(REMOTE_MANIFEST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(path => typeof path === 'string' && path.startsWith(REMOTE_DIR) && IMAGE_EXT_RE.test(path))
  } catch {
    return []
  }
}

function writeStoredManifest(paths) {
  try {
    localStorage.setItem(REMOTE_MANIFEST_KEY, JSON.stringify(paths))
  } catch {
    // Ignore quota and privacy-mode failures.
  }
}

async function fetchRemoteManifest() {
  const timeout = timeoutSignal(REMOTE_FETCH_TIMEOUT)

  try {
    const response = await fetch(REMOTE_MANIFEST_URL, {
      mode: 'cors',
      signal: timeout.signal,
    })

    if (!response.ok) {
      throw new Error(`Remote manifest failed: ${response.status}`)
    }

    const data = await response.json()
    const paths = (data.files || [])
      .map(file => file?.name)
      .filter(path => typeof path === 'string' && path.startsWith(REMOTE_DIR) && IMAGE_EXT_RE.test(path))
      .sort(comparePath)

    if (paths.length > 0) writeStoredManifest(paths)
    return paths
  } finally {
    timeout.clear()
  }
}

async function loadRemoteManifest() {
  try {
    const paths = await fetchRemoteManifest()
    if (paths.length > 0) return paths
  } catch {
    // Fall back to the last successful remote manifest.
  }

  return readStoredManifest()
}

async function responseToObjectUrl(response) {
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

async function cacheRemoteImage(cache, cat) {
  const cached = cache ? await cache.match(cat.originalSrc) : null
  if (cached) {
    return {
      ...cat,
      src: await responseToObjectUrl(cached),
    }
  }

  const timeout = timeoutSignal(REMOTE_FETCH_TIMEOUT)

  try {
    const response = await fetch(cat.originalSrc, {
      mode: 'cors',
      signal: timeout.signal,
    })

    if (!response.ok) {
      throw new Error(`Remote image failed: ${response.status}`)
    }

    if (cache) await cache.put(cat.originalSrc, response.clone())

    return {
      ...cat,
      src: await responseToObjectUrl(response),
    }
  } finally {
    timeout.clear()
  }
}

async function openImageCache() {
  try {
    return 'caches' in window ? await caches.open(REMOTE_CACHE_NAME) : null
  } catch {
    return null
  }
}

async function loadCachedCatalog(cache, paths) {
  if (!cache || paths.length < BOARD_PAIRS) return []

  const cats = buildRemoteCatalog(paths)
  const cachedCats = await Promise.all(
    cats.map(async cat => {
      const cached = await cache.match(cat.originalSrc)
      if (!cached) return null
      return {
        ...cat,
        src: await responseToObjectUrl(cached),
      }
    })
  )

  const resolved = cachedCats.filter(Boolean)
  return resolved.length === paths.length ? resolved : []
}

function buildRemoteCatalog(paths) {
  return paths.map(path => ({
    id: path,
    name: displayNameFromPath(path),
    originalName: nameFromPath(path),
    file: path,
    originalSrc: cdnUrl(path),
    src: cdnUrl(path),
  }))
}

function buildLocalFallbackCatalog() {
  return LOCAL_FALLBACKS.map(cat => ({
    id: `local:${cat.file}`,
    name: cat.name,
    file: cat.file,
    src: localUrl(cat.file),
  }))
}

async function loadRemoteCatalog(cache) {
  const paths = await loadRemoteManifest()
  if (paths.length < BOARD_PAIRS) return []

  const cats = buildRemoteCatalog(paths)
  const cachedCats = await Promise.all(
    cats.map(async cat => {
      try {
        return await cacheRemoteImage(cache, cat)
      } catch {
        return null
      }
    })
  )

  return cachedCats.filter(Boolean)
}

export function createBoard(cats) {
  const picked = shuffle(cats).slice(0, BOARD_PAIRS)
  return shuffle(
    picked.flatMap(cat => [
      { ...cat, uid: `${cat.id}-a`, flipped: false, matched: false },
      { ...cat, uid: `${cat.id}-b`, flipped: false, matched: false },
    ])
  )
}

export function calcPoints(combo) {
  return 10 * (1 + Math.floor(combo / 2))
}

export async function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const cache = await openImageCache()
      const storedPaths = readStoredManifest()
      const cachedCats = await loadCachedCatalog(cache, storedPaths)

      if (cachedCats.length >= BOARD_PAIRS) {
        return cachedCats
      }

      const remoteCats = await loadRemoteCatalog(cache)
      if (remoteCats.length >= BOARD_PAIRS) return remoteCats
      return buildLocalFallbackCatalog()
    })()
  }

  return catalogPromise
}
