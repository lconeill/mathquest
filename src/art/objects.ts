import list from './art-list.json'

export type ArtSlug = keyof typeof list

export const artUrl = (slug: string) => `${import.meta.env.BASE_URL}art/${slug}.svg`

/** Things a child can count. `one`/`many` are used in spoken prompts. */
export interface ObjectSet { slug: ArtSlug; one: string; many: string }

export const COUNTABLES: ObjectSet[] = [
  { slug: 'apple', one: 'apple', many: 'apples' },
  { slug: 'duck', one: 'duck', many: 'ducks' },
  { slug: 'ladybug', one: 'ladybug', many: 'ladybugs' },
  { slug: 'car', one: 'car', many: 'cars' },
  { slug: 'cookie', one: 'cookie', many: 'cookies' },
  { slug: 'star', one: 'star', many: 'stars' },
  { slug: 'rocket', one: 'rocket', many: 'rockets' },
  { slug: 'fish', one: 'fish', many: 'fish' },
  { slug: 'dog', one: 'puppy', many: 'puppies' },
  { slug: 'cat', one: 'kitty', many: 'kitties' },
  { slug: 'strawberry', one: 'strawberry', many: 'strawberries' },
  { slug: 'banana', one: 'banana', many: 'bananas' },
  { slug: 'balloon', one: 'balloon', many: 'balloons' },
  { slug: 'butterfly', one: 'butterfly', many: 'butterflies' },
  { slug: 'frog', one: 'frog', many: 'frogs' },
  { slug: 'owl', one: 'owl', many: 'owls' },
  { slug: 'penguin', one: 'penguin', many: 'penguins' },
  { slug: 'turtle', one: 'turtle', many: 'turtles' },
  { slug: 'bee', one: 'bee', many: 'bees' },
  { slug: 'chick', one: 'chick', many: 'chicks' },
  { slug: 'cupcake', one: 'cupcake', many: 'cupcakes' },
  { slug: 'donut', one: 'donut', many: 'donuts' },
  { slug: 'carrot', one: 'carrot', many: 'carrots' },
  { slug: 'bus', one: 'bus', many: 'buses' },
  { slug: 'soccer', one: 'ball', many: 'balls' },
  { slug: 'flower', one: 'flower', many: 'flowers' },
]

export const objectBySlug = (slug: string) => COUNTABLES.find((o) => o.slug === slug) ?? COUNTABLES[0]
export const nameFor = (o: ObjectSet, n: number) => (n === 1 ? o.one : o.many)

export interface StickerCollection { id: string; name: string; stickers: ArtSlug[] }

export const STICKER_COLLECTIONS: StickerCollection[] = [
  { id: 'animals', name: 'Animals', stickers: ['lion', 'tiger', 'panda', 'elephant', 'giraffe', 'zebra', 'monkey', 'koala', 'fox', 'pig', 'cow', 'rabbit', 'unicorn', 'sauropod', 'trex'] },
  { id: 'ocean', name: 'Ocean', stickers: ['tropical-fish', 'octopus', 'crab', 'dolphin', 'whale', 'shark', 'jellyfish', 'seal', 'shell', 'coral', 'mermaid', 'turtle'] },
  { id: 'space', name: 'Space', stickers: ['rocket', 'planet', 'ufo', 'astronaut', 'moon', 'sun', 'comet', 'shooting-star', 'glowing-star'] },
  { id: 'treats', name: 'Treats', stickers: ['cupcake', 'donut', 'ice-cream', 'watermelon', 'grapes', 'pizza', 'cherries', 'cookie', 'strawberry'] },
  { id: 'treasures', name: 'Treasures', stickers: ['trophy', 'crown', 'gem', 'party', 'rainbow', 'clover', 'tulip', 'basketball', 'teddy', 'gift', 'balloon'] },
]

export const ALL_STICKERS: ArtSlug[] = STICKER_COLLECTIONS.flatMap((c) => c.stickers)

export const AVATARS: ArtSlug[] = ['lion', 'panda', 'fox', 'unicorn', 'trex', 'octopus', 'penguin', 'rabbit', 'koala', 'monkey', 'astronaut', 'frog']
