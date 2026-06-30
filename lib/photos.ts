export type Photo = { filename: string; description: string };

export const PHOTOS: Photo[] = [
  // portraits / personal
  { filename: "paris-love-wall.jpg", description: "solo at the Wall of Love in Paris, contemplative" },
  { filename: "murder-mystery.jpg", description: "pinstripe suit and cigar at a murder mystery party, dressed-up energy" },
  { filename: "handroll-class.jpeg", description: "at a handroll making class, wearing black gloves and grinning — good pick when someone challenges your looks" },
  { filename: "puppies-yoga.jpg", description: "cradling a golden retriever puppy at a Puppies & Yoga event" },
  { filename: "bar-friends.jpg", description: "casual bar night with a friend, warm film-grain aesthetic" },
  { filename: "sculpting_photo.jpg", description: "standing next to a clay bust he made in an art studio" },
  { filename: "dog.jpg", description: "holding a Yorkshire Terrier in a tartan outfit" },
  { filename: "sunset-dinner.jpg", description: "elevated dinner with friends and a water-view sunset" },

  // travel — iceland
  { filename: "iceland-waterfall.jpg", description: "standing in front of a large waterfall in Iceland, bundled up" },
  { filename: "iceland-beach.jpg", description: "on a black sand beach next to glacial ice, moody and stark" },
  { filename: "iceland-reynisfjara.jpg", description: "Reynisfjara black sand beach with dramatic basalt sea stacks, overcast — Iceland landscape photography" },
  { filename: "iceland-jokulsarlon.jpg", description: "Jökulsárlón glacier lagoon with floating icebergs under a grey sky — Iceland" },
  { filename: "iceland-svartifoss.jpg", description: "Svartifoss waterfall framed by hexagonal basalt columns — signature Iceland shot" },
  { filename: "iceland-seljalandsfoss.jpg", description: "Seljalandsfoss waterfall cascading from a cliff, green hillside — Iceland" },
  { filename: "iceland-thingvellir-overlook.jpg", description: "Þingvellir national park wide view, river winding through green valley to a lake — Iceland Golden Circle" },
  { filename: "iceland-thingvellir-rift.jpg", description: "Þingvellir tectonic rift canyon, people walking the path between continental plates — Iceland" },
  { filename: "iceland-lava.jpg", description: "glowing molten lava dripping and pooling in darkness — Iceland volcanic eruption, shot at night" },

  // travel — egypt
  { filename: "pyramids.jpg", description: "selfie in front of the Great Pyramids of Giza" },

  // travel — costa rica
  { filename: "costa-rica-rio-celeste.jpg", description: "Rio Celeste waterfall, electric turquoise pool in dense jungle — Costa Rica" },
  { filename: "costa-rica-sloth-face.jpg", description: "three-toed sloth face close-up, looks like it's smiling — Costa Rica" },
  { filename: "costa-rica-sloth-branch.jpg", description: "three-toed sloth lounging on a jungle branch, shot from below — Costa Rica" },
  { filename: "costa-rica-sunset.jpg", description: "sunset from a hilltop lodge, crowd of silhouettes against amber horizon — Costa Rica" },
  { filename: "costa-rica-hummingbird.jpg", description: "violet sabrewing hummingbird perched, iridescent purple-blue — Costa Rica wildlife" },
  { filename: "costa-rica-hummingbird-violet.jpg", description: "hummingbird through spotting scope, electric blue shimmer against bokeh — Costa Rica" },
  { filename: "costa-rica-tanager-red.jpg", description: "scarlet red bird perched on a banana slice, vivid against dark background — Costa Rica" },
  { filename: "costa-rica-tanager-blue.jpg", description: "blue-gray tanager close-up, beak open — Costa Rica bird photography" },
  { filename: "costa-rica-honeycreeper.jpg", description: "red-legged honeycreeper, brilliant blue with red legs eating fruit — Costa Rica" },
  { filename: "costa-rica-squirrel.jpg", description: "variegated squirrel eating through a spotting scope, circular frame — Costa Rica" },
  { filename: "costa-rica-iguana.jpg", description: "black iguana sunning on a branch through spotting scope — Costa Rica" },
  { filename: "costa-rica-scorpion-uv.jpg", description: "scorpion glowing cyan under UV blacklight on a rock — Costa Rica night walk" },
  { filename: "costa-rica-insect-macro.jpg", description: "tiny grasshopper nymph held between fingertips, extreme macro — Costa Rica" },
  { filename: "costa-rica-walkingstick.jpg", description: "walking stick insect held next to a real leaf showing camouflage — Costa Rica" },
  { filename: "costa-rica-cockroach.jpg", description: "giant cockroach held on open palm, no flinching — Costa Rica" },

  // photography
  { filename: "ram-in-glacier-national-park.jpeg", description: "ram in Glacier National Park, Montana — shot by me" },
  { filename: "jellyfish.jpg", description: "underwater shot of a jellyfish — shot by me" },
  { filename: "flying-fish-hawaii.jpg", description: "flying fish leaping off the water in Hawaii — shot by me" },
];

export const PHOTO_FILENAMES = PHOTOS.map((p) => p.filename);
