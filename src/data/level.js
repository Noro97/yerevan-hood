// Written by the studio (Level tab): the street's layout. Edit here or in the studio.
// layers: sky / far / mid scroll with parallax, street / fences / cables with the world, fore in front.
// buildings: `texture` indexes the building textures; y is the ground line of the building's anchor.
// props: y-sorted with the fighters. floor: the walkable strip (fighters' feet).
export default {
  floor: { top: 392, bottom: 538 },
  layers: {
    sky: { x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true },
    far: { x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true },
    mid: { x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true },
    street: { x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true },
    fences: { x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true },
    cables: { x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true },
    fore: { x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 0.3, visible: true },
  },
  buildings: [
    { texture: 0, x: 0, y: 398, scaleX: 1.1, scaleY: 1.1, visible: true },
    { texture: 1, x: 311, y: 398, scaleX: 1.3, scaleY: 1.3, visible: true },
    { texture: 2, x: 641, y: 398, scaleX: 1.5, scaleY: 1.5, visible: true },
    { texture: 3, x: 1143, y: 398, scaleX: 1, scaleY: 1, visible: true },
    { texture: 4, x: 1365, y: 398, scaleX: 1, scaleY: 1, visible: true },
    { texture: 5, x: 1647, y: 398, scaleX: 1, scaleY: 1, visible: true },
    { texture: 6, x: 1899, y: 398, scaleX: 1, scaleY: 1, visible: true },
    { texture: 7, x: 2201, y: 398, scaleX: 1, scaleY: 1, visible: true },
    { texture: 8, x: 2443, y: 398, scaleX: 1, scaleY: 1, visible: true },
    { texture: 9, x: 2755, y: 398, scaleX: 1, scaleY: 1, visible: true },
  ],
  props: [
    { id: "lamp_1", type: "lamp", x: 180, y: 396, scale: 1 },
    { id: "lamp_2", type: "lamp", x: 980, y: 396, scale: 1 },
    { id: "lamp_3", type: "lamp", x: 1780, y: 396, scale: 1 },
    { id: "lamp_4", type: "lamp", x: 2580, y: 396, scale: 1 },
    { id: "lada_1", type: "lada", x: 1320, y: 412, scale: 1.25 },
    { id: "bin_1", type: "bin", x: 565, y: 400, scale: 1 },
    { id: "bin_2", type: "bin", x: 1965, y: 402, scale: 1 },
  ],
};
