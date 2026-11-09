// Low Roller — game rules. Pure data and functions: no DOM, no Three.js.
// Loaded as a classic <script> by index.html (its top-level names are globals the game uses)
// and require()'d by the balance sim and unit tests through the export at the bottom.
/*LOGIC-START*/
const DT = {
  d6:     {name:'House Die',   short:'d6', skin:'bone',   faces:[1,2,3,4,5,'C'],              tier:'c', price:4,  desc:'The standard die. A crown scores 0.'},
  d8:     {name:'Octo',        short:'d8', skin:'octo',   faces:[1,2,3,4,5,6,7,'C'],          tier:'c', price:3,  desc:'Eight sides. Usually rolls high.'},
  pebble: {name:'Pebble',      short:'d4', skin:'pebble', faces:[1,2,3,'C'],                  tier:'c', price:6,  size:.46, desc:'Four sides, all low.'},
  loaded: {name:'Loaded Die',  short:'LD', skin:'loaded', faces:[1,1,2,3,4,'C'],              tier:'u', price:8,  desc:'Weighted low. Never rolls a 5.'},
  glass:  {name:'Glass Die',   short:'GL', skin:'glass',  faces:[1,1,1,2,'C','C'],            tier:'c', price:5,  breaks:3, desc:'Great faces, but it shatters after you draw it for 3 rounds.'},
  ember:  {name:'Ember',       short:'EM', skin:'ember',  faces:[1,2,3,4,5,6,'C','C'],        tier:'u', price:7,  desc:'Two crowns on eight sides. Bank a crown: you get +2 odds this round.'},
  devil:  {name:"Devil's Die", short:'−1', skin:'devil',  faces:[-1,2,3,4,5,'C'],             tier:'u', price:9,  desc:'One face is −1: it takes a point off your score.'},
  coin:   {name:'Lucky Coin',  short:'¢',  skin:'coin',   faces:[1,'C'],                      tier:'u', price:14, desc:'Only ever a 1 or a crown.'},
  twin:   {name:'Twin',        short:'TW', skin:'twin',   faces:[1,2,3,4,5,'C'],              tier:'u', price:8,  desc:'Copies your lowest other die in the same throw.'},
  gamble: {name:'High Roller', short:'12', skin:'gamble', faces:[1,2,3,4,5,6,7,8,9,10,11,'C'], tier:'u', price:6, size:.62, desc:'Mostly awful. Bank its crown: you get ×2 odds this round and $3.'},
  shaved: {name:'Shaved Die',  short:'SH', skin:'shaved', faces:[1,1,2,2,'C','C'],            tier:'r', price:16, rare:true, desc:'Two 1s, two 2s, two crowns.'},
  gilded: {name:'Gilded Die',  short:'GD', skin:'gilded', faces:[1,2,3,4,5,'C'],              tier:'u', price:9,  desc:'Bank its crown: you get $2.'},
  bomb:   {name:'Cherry Bomb', short:'CB', skin:'bomb',   faces:[1,2,3,4,5,'C'],              tier:'u', price:8,  desc:'Bank its crown: the opponent loses 8% of their max nerve on the spot (at least 2).'},
  goose:  {name:'Goose Egg',   short:'00', skin:'goose',  faces:[0,0,4,5,6,'C'],              tier:'c', price:5,  desc:'Two faces are 0. The rest run high.'},
  boxcar: {name:'Boxcars',     short:'BX', skin:'boxcar', faces:[1,1,1,6,6,'C'],              tier:'u', price:7,  desc:'Three 1s, two 6s. Pairs well with Snake Eyes.'},
};
const SHOP_DICE=['pebble','loaded','glass','ember','devil','coin','twin','gamble','gilded','bomb','goose','boxcar'];
// tier: c common · u uncommon · r rare.  Odds math: (1 + every +odds) × every ×odds
const CHARMS={
  jewels:  {name:'Crown Jewels',  ico:'♛', tier:'c', price:6, desc:'You get +1 odds per crown you bank.'},
  slowburn:{name:'Slow Burn',     ico:'≈', tier:'c', price:6, desc:'You get +1 odds per round you’ve won in a row at this table.'},
  cut:     {name:"Dealer's Cut",  ico:'%', tier:'c', price:5, desc:'When you win a round, your “ahead by” counts 2 higher.'},
  bouncer: {name:'The Bouncer',   ico:'B', tier:'u', price:10, desc:'The opponent’s score counts 1 higher, so you win ties. Doesn’t make your hits bigger.'},
  thick:   {name:'Thick Skin',    ico:'T', tier:'c', price:5, desc:'Rounds you lose hit you 2 less (at least 1).'},
  tip:     {name:'Tip Jar',       ico:'$', tier:'c', price:5, desc:'You get $2 for every round you win.'},
  goldcrown:{name:'Gold Tooth',   ico:'¢', tier:'c', price:5, desc:'You get $1 per crown you bank.'},
  hothand: {name:'Hot Hand',      ico:'♥', tier:'c', price:5, desc:'You heal 1 nerve per crown you bank.'},
  liver:   {name:'Iron Liver',    ico:'+', tier:'c', price:6, desc:'You get +12 max nerve.'},
  cigar:   {name:'Victory Cigar', ico:'V', tier:'c', price:5, desc:'You heal 6 nerve after every fight you win.'},
  penny:   {name:'Lucky Penny',   ico:'1', tier:'r', price:17, rare:true, desc:'Your first throw each round: your 1s score 0.'},
  spoon:   {name:'Bent Spoon',    ico:'↻', tier:'u', price:9,  desc:'Once per round: pick one of your dice and reroll it.'},
  lastcall:{name:'Last Call',     ico:'L', tier:'r', price:16, rare:true, desc:'Your final bank each round: its highest die counts 1 less.'},
  jacks:   {name:'Pair of Jacks', ico:'J', tier:'u', price:9,  desc:'In each bank you make, repeat faces score 0. (3, 3, 5 counts as 3 + 0 + 5.)'},
  snake:   {name:'Snake Eyes',    ico:'∴', tier:'u', price:9,  desc:'You get +1 odds per 1 you bank.'},
  patience:{name:'One at a Time', ico:'I', tier:'u', price:10, desc:'Bank exactly one die every throw for a whole round: you get +4 odds.'},
  barfly:  {name:'Bar Fly',       ico:'b', tier:'u', price:9,  desc:'You get +1 odds per $6 you’re holding.'},
  tally:   {name:'Tally Card',    ico:'#', tier:'u', price:8,  desc:'You get +1 odds per 2 fights you’ve won while holding this.'},
  rabbit:  {name:"Rabbit's Foot", ico:'R', tier:'u', price:9,  desc:'The first round you lose at each table doesn’t hurt you.'},
  closer:  {name:'The Closer',    ico:'C', tier:'u', price:12, desc:'Win a round by 5 or more: you get ×1.5 odds.'},
  kingpin: {name:'Kingpin',       ico:'K', tier:'r', price:18, rare:true, desc:'You get ×1.25 odds per crown you bank. Stacks.'},
  lowball: {name:'Low Ball',      ico:'0', tier:'r', price:16, rare:true, desc:'Finish a round on 2 or less: you get ×1.5 odds.'},
  opener:  {name:'Opening Act',   ico:'O', tier:'c', price:6, desc:'Your first round at each table: you get ×2 odds.'},
  packed:  {name:'Packed House',  ico:'P', tier:'c', price:6, desc:'You get +1 odds per 2 dice in your bag.'},
  stack:   {name:'Short Stack',   ico:'S', tier:'u', price:9, desc:'You get +2 odds per die your bag is short of 9.'},
  allin:   {name:'All In',        ico:'A', tier:'u', price:10, desc:'Bank every die on your first throw: you get ×3 odds.'},
  glassblower:{name:'Glassblower',ico:'G', tier:'c', price:5, desc:'You get +2 odds per Glass Die you bank. Your Glass Dice last 2 more rounds.'},
  nearmiss:{name:'Near Miss',     ico:'N', tier:'c', price:5, desc:'You lose a round by exactly 1: nobody gets hit.'},
  blood:   {name:'Blood Money',   ico:'D', tier:'u', price:8, desc:'You get +5 odds. You lose 1 nerve every round (never your last).'},
  threes:  {name:'Three\u2019s Company',ico:'3', tier:'c', price:5, desc:'You get +2 odds per 3 you bank.'},
  regular: {name:'The Regular',   ico:'r', tier:'u', price:9, desc:'You get +1 odds per round already played at this table.'},
  heckler: {name:'The Heckler',   ico:'H', tier:'u', price:10, desc:'Your first 2 crowns each round add 1 each to the opponent’s score.'},
  doubledown:{name:'Double Down', ico:'2', tier:'r', price:16, rare:true, desc:'Won your last round at this table: you get ×2 odds.'},
  highstakes:{name:'High Stakes', ico:'×', tier:'r', price:15, rare:true, desc:'You get ×2 odds, but rounds you lose hit you 2 harder.'},
  bookie:  {name:'The Bookie',    ico:'§', tier:'r', price:15, rare:true, desc:'Win a round: you get $1 per point you won by, up to $8.'},
};
const TIER_NAME={c:'Common',u:'Uncommon',r:'Rare'};
const MAX_CHARMS=5;
const QUIRKS={
  cold: {name:'Cold Table',     desc:'Your first throw each round: your crowns score 1 instead of 0.'},
  fuse: {name:'Short Fuse',     desc:'Your first throw each round: you must bank at least 2 dice.'},
  haze: {name:'Haze',           desc:'Your first throw each round: one of your dice lands face-down until you bank it.'},
  steal:{name:'Sticky Fingers', desc:'The opponent takes $3 from you every round they win.'},
  edge: {name:'House Edge',     desc:'The opponent’s score counts 1 lower every round.'},
  nervous:{name:'Nervous Wreck', help:true, desc:'The opponent loses 1 nerve every round, win or lose.'},
  grudge:{name:'Holds a Grudge', desc:'Once the opponent is at half nerve, rounds they win hit you 2 harder.'},
  hot:  {name:'Hot Streak',     desc:'Each round the opponent wins in a row hits you 1 harder than the last.'},
  tax:  {name:'Cover Charge',   desc:'Every round at this table costs you $1.'},
  heavy:{name:'Heavy Hand',     desc:'Every round the opponent wins, you draw an extra die next round.'},
  copycat:{name:'Copycat',      desc:'Bank any crown in a round and the opponent’s score drops by 1.'},
  sharp:{name:'Sharp',          desc:'Ties go to the opponent.'},
  sloppy:{name:'Three Sheets',  help:true, desc:'The opponent’s score counts 1 higher every round.'},
  pair: {name:'Two Heads',      desc:'Both twins throw. The opponent keeps the lower total.'},
  loud: {name:'Loudmouth',      desc:'Your odds count 2 lower (never under 1).'},
};
// Three rooms, each with its own regulars, sharks and a boss with a signature move.
const ACTS=[
 {name:'The Rusty Nail', boss:'Big Sal', short:'Sal', bossD:'The owner. Beat her and the Nail is yours.', est:'EST. 1926',
  theme:{felt:'#1b4636',trim:'#c9a14a',wall:'#16241d',pat:'#8a6d2e',style:'fan',lamp:0xffc27a,neon:'LOW ROLLER',neonC:'#ff3a6a',neonT:'#ffb3c4'},
  half:{add:['haze'],t:1,big:'No more smiles',small:'Sal adds Haze and plays tight',note:'She slams the table after your first throw, knocking your two best dice back into play. She adds Haze and plays tight.'},
  foes:{
  t1:[
    {n:'Mopey Earl',   s:'Regular. Sad about it.',     hp:8,  bag:['d6','d6','d6','d6','d6','d8'], t:2, q:['nervous'], look:{coat:0x3b3f4a,hat:'cap',eye:0xffd27a}},
    {n:'Twitchy Dee',  s:'Rolls before you sit down.', hp:9,  bag:['pebble','d6','d6','d8','d8','d6'], t:2, look:{coat:0x4a2f3d,hat:'none',eye:0x9ff5d3}},
    {n:'Old Gus',      s:'Been here since ’26.',   hp:10, bag:['d6','d6','d6','d6','d6','d6'], t:2, q:['haze'], look:{coat:0x2e3a2c,hat:'bowler',eye:0xfff1c0,mustache:true}}],
  t2:[
    {n:'Two-Beer Tina',s:'Hand in your pocket.',       hp:13, bag:['d6','d6','d6','d6','d6','loaded'], t:2, q:['steal'], look:{coat:0x6b1f35,hat:'cloche',eye:0xff8fb0}},
    {n:'Lefty',        s:'Deals with his right.',      hp:12, bag:['d6','d6','d6','d6','d6','loaded'], t:2, q:['cold'], look:{coat:0x1f2f45,hat:'fedora',eye:0x8fd3ff,mustache:true}},
    {n:'Dutch',        s:'Bets the deed.',             hp:15, bag:['loaded','loaded','pebble','d6','d6','d6'], t:2, q:['grudge'], look:{coat:0x3d2a1a,hat:'fedora',eye:0xffb547,band:0x2a4a6a}}],
  e1:[{n:'Knuckles',   s:'Bouncer. Off the clock.',    hp:15, bag:['d6','d6','d6','d6','d6','loaded'], t:2, q:['fuse'], look:{coat:0x222222,hat:'cap',eye:0xff5470,scale:1.15}}],
  e2:[
    {n:'Pearl',        s:'Never blinks.',              hp:20, bag:['pebble','pebble','loaded','d6','d6','d6'], t:2, q:['haze','steal'], look:{coat:0xd8d2c4,hat:'cloche',eye:0xff5470}},
    {n:'The Twins',    s:'Finish each other’s rolls.', hp:17, bag:['loaded','loaded','pebble','d6','d6','glass'], t:2, q:['pair'], look:{coat:0x2b2440,hat:'bowler',eye:0xc9a0ff,scale:1.1}}],
  boss:{n:'Big Sal', s:'Owns the Rusty Nail', hp:32, bag:['loaded','loaded','d6','d6','d6','pebble'], t:2, q:['edge'], boss:true, sig:'slam', look:{coat:0x5a1520,hat:'fedora',eye:0xffb547,scale:1.3,cigar:true,band:0xc9a14a,tie:0x1a1a1a}}}},
 {name:'The Velvet Room', boss:'The Countess', short:'The Countess', bossD:'She runs the room upstairs. Every round she swaps one of your dice for an Octo.', est:'MEMBERS ONLY',
  theme:{felt:'#4a1424',trim:'#d8b25c',wall:'#3a0c16',pat:'#b8903f',style:'diamond',lamp:0xffb89a,neon:'VELVET',neonC:'#b04aff',neonT:'#e8c4ff'},
  half:{add:['edge'],t:1,big:'The gloves come off',small:'Two swaps a round, and House Edge',note:'Every round she swaps one of your dice for an Octo. At half nerve it’s two, and she adds House Edge.'},
  foes:{
  t1:[
    {n:'Silk Vincent', s:'Smells like money.',         hp:16, bag:['loaded','d6','d6','d6','pebble','d6'], t:2, q:['tax'], look:{coat:0x3a1030,hat:'fedora',eye:0xff9ad0}},
    {n:'Madame Ora',   s:'Already knows your roll.',   hp:17, bag:['glass','d6','d6','loaded','d6','d6'], t:2, q:['haze'], look:{coat:0x2a1a3a,hat:'cloche',hatc:0x4a1a4a,eye:0xc9a0ff}},
    {n:'Cigarette Dot',s:'Sells smokes, steals change.',hp:17, bag:['d6','d6','loaded','pebble','d6','d6'], t:2, q:['steal','nervous'], look:{coat:0x7a1c2a,hat:'cloche',eye:0xffd27a}}],
  t2:[
    {n:'Professor Hale',s:'Counts on his fingers. Fast.',hp:20, bag:['loaded','loaded','pebble','d6','d6','d6'], t:1, q:['fuse'], look:{coat:0x2a2a2a,hat:'bowler',eye:0x9ff5d3,mustache:true}},
    {n:'Vito',         s:'Smiles with his mouth only.', hp:21, bag:['loaded','loaded','d6','d6','d6','pebble'], t:1, q:['edge'], look:{coat:0x1a1a2a,hat:'fedora',eye:0xff5470}},
    {n:'Mr. Velvet',   s:'Named the room after himself.',hp:22, bag:['loaded','pebble','pebble','d6','d6','d6'], t:1, q:['cold','hot'], look:{coat:0x5a0f1f,hat:'fedora',band:0xc9a14a,eye:0xffb547}}],
  e1:[{n:'Lady Chance',  s:'Wears your luck as a necklace.',hp:26, bag:['pebble','pebble','loaded','loaded','d6','d6'], t:1, q:['steal','haze','hot'], look:{coat:0x1a0a20,hat:'cloche',hatc:0x6a1a5a,eye:0xff9ad0,scale:1.1}}],
  e2:[{n:'The Twins Again',s:'Back for your wallet.',     hp:24, bag:['loaded','loaded','pebble','pebble','d6','glass'], t:1, q:['pair','steal'], look:{coat:0x1e3a36,hat:'bowler',eye:0x9ff5d3,scale:1.15}}],
  boss:{n:'The Countess', s:'Holds court upstairs', hp:42, bag:['loaded','loaded','loaded','pebble','d6','glass'], t:1, q:[], boss:true, sig:'gift', look:{coat:0x2a0a1a,hat:'cloche',hatc:0x12040c,eye:0xd8a8ff,scale:1.3,tie:0xc9a14a}}}},
 {name:'The Back Room', boss:'The House', short:'The House', bossD:'Nobody’s seen his face. Ties go to the house.', est:'NO EXIT',
  theme:{felt:'#2c383a',trim:'#8f8a74',wall:'#262824',pat:'#3a3c36',style:'brick',lamp:0xd8ffe4,neon:'NO EXIT',neonC:'#ff2a2a',neonT:'#ffb0a0'},
  half:{add:['haze'],t:1,big:'The house always wins',small:'Haze, and he plays tight',note:'Every tie goes to him and costs you 2. At half nerve he adds Haze and plays tight.'},
  foes:{
  t1:[
    {n:'The Accountant',s:'Counts your breaths.',      hp:24, bag:['loaded','loaded','pebble','coin','d6','d6'], t:1, q:['edge','grudge'], look:{coat:0x2a2a2a,hat:'bowler',eye:0xfff1c0,mustache:true}},
    {n:'Miss Ruby',    s:'Collects debts.',            hp:25, bag:['pebble','pebble','loaded','coin','d6','d6'], t:1, q:['steal'], look:{coat:0x8a1020,hat:'cloche',eye:0xff5470}},
    {n:'Tony Two-Times',s:'Never says anything once.',  hp:26, bag:['loaded','loaded','loaded','coin','d6','d6'], t:1, q:['haze','hot'], look:{coat:0x1a1a1a,hat:'fedora',eye:0xff8a1a}}],
  t2:[
    {n:'Ledger Lou',   s:'Writes your name down.',      hp:28, bag:['loaded','loaded','pebble','pebble','coin','d6'], t:1, q:['fuse','tax'], look:{coat:0x3a3428,hat:'cap',eye:0xffd27a}},
    {n:'The Widow',    s:'Third husband this year.',    hp:29, bag:['loaded','pebble','pebble','glass','coin','d6'], t:1, q:['cold','haze'], look:{coat:0x0a0a0a,hat:'cloche',hatc:0x050505,eye:0xffffff}},
    {n:'Bruno',        s:'Doesn’t play. Collects.',hp:30, bag:['loaded','loaded','loaded','pebble','coin','d6'], t:1, q:['edge','heavy'], look:{coat:0x2a1a10,hat:'cap',eye:0xff5470,scale:1.2}}],
  e1:[{n:'The Enforcer', s:'Cracks his knuckles between throws.',hp:34, bag:['loaded','loaded','loaded','pebble','shaved','coin'], t:1, q:['fuse','steal','heavy'], look:{coat:0x1a1410,hat:'cap',eye:0xff2a2a,scale:1.25}}],
  e2:[{n:'The Ledger',   s:'Nobody leaves owing.',        hp:38, bag:['loaded','loaded','loaded','pebble','pebble','shaved'], t:1, q:['edge','haze'], look:{coat:0x202024,hat:'bowler',eye:0xfff1c0,scale:1.15}}],
  boss:{n:'The House', s:'Always wins. Usually.', hp:56, bag:['shaved','shaved','coin','loaded','pebble','pebble'], t:1, q:['tax'], boss:true, sig:'house', look:{coat:0x101014,hat:'fedora',band:0xc9a14a,eye:0xffffff,scale:1.4,cigar:true,tie:0x7a1424}}}},
];
// ---- more faces at every table: extra regulars and sharks, and a second boss for each room ----
const MORE=[
 {t1:[{n:'Sleepy Joe',   s:'Nods off between throws.',      hp:9,  bag:['d6','d6','d6','d6','d6','d8'], t:2, q:['sloppy'], look:{coat:0x4a4038,hat:'cap',eye:0xffe0a0}}],
  t2:[{n:'Copper Penny', s:'Copies everything you do.',     hp:13, bag:['d6','d6','d6','d6','loaded','pebble'], t:2, q:['copycat'], look:{coat:0x8a4a20,hat:'cloche',eye:0xffb070}}],
  e2:[{n:'Loudmouth Lenny',s:'Never shuts up. Never.',      hp:21, bag:['loaded','loaded','pebble','d6','d6','d6'], t:2, q:['loud','hot'], look:{coat:0x6a5a1a,hat:'fedora',eye:0xffd27a}}],
  alt:{n:'Mama Rosa', s:'Feeds you, then bleeds you.', hp:40, bag:['loaded','loaded','loaded','pebble','d6','d6'], t:1, q:['tax'], boss:true, sig:'feed', short:'Rosa',
   d:'Runs the kitchen. Every round she wins, she heals what she took.', sigT:'Every round she wins, she heals what she hit you for.',
   half:{add:['hot'],t:1,big:'Second helpings',small:'Rosa adds Hot Streak'}, look:{coat:0x6a1a1a,hat:'none',eye:0xffb547,scale:1.25}}},
 {t1:[{n:'Dapper Dan',   s:'Tie straight. Odds straighter.',hp:17, bag:['loaded','d6','d6','d6','pebble','d6'], t:2, q:['sharp'], look:{coat:0x2a3a5a,hat:'top',eye:0x9fd3ff}}],
  t2:[{n:'Miss Fortune', s:'Reads your dice before they land.',hp:20, bag:['loaded','loaded','pebble','d6','d6','glass'], t:1, q:['copycat','haze'], look:{coat:0x3a1a4a,hat:'turban',eye:0xe0a0ff}}],
  e2:[{n:'The Magpie',   s:'Anything shiny.',               hp:26, bag:['loaded','loaded','pebble','pebble','d6','coin'], t:1, q:['steal','copycat'], look:{coat:0x101418,hat:'cloche',eye:0x9ff5d3}}],
  alt:{n:'The Great Zambini', s:'Pulls your luck out of a hat.', hp:29, bag:['loaded','loaded','loaded','pebble','d6','glass'], t:1, q:[], boss:true, sig:'trick', short:'Zambini',
   d:'A stage magician. Two of your dice land face-down every throw.', sigT:'Two of your dice land face-down every throw. Three at half nerve.',
   half:{add:['copycat'],t:1,big:'For my next trick',small:'Three dice hidden, and Copycat'}, look:{coat:0x1a0a2a,hat:'top',eye:0xc9a0ff,scale:1.25}}},
 {t1:[{n:'Officer Kelly',s:'On the take. On the clock.',    hp:25, bag:['loaded','loaded','pebble','coin','d6','d6'], t:1, q:['loud','tax'], look:{coat:0x1a2a4a,hat:'cap',eye:0x9fd3ff}}],
  t2:[{n:'Lucky Lucy',   s:'Has never lost a tie.',         hp:29, bag:['loaded','loaded','pebble','pebble','coin','d6'], t:1, q:['sharp','hot'], look:{coat:0x2a5a3a,hat:'cloche',eye:0xa0ffb0}}],
  e1:[{n:'Doc Mortimer', s:'Sews up the losers. Charges extra.',hp:36, bag:['loaded','loaded','pebble','pebble','shaved','coin'], t:1, q:['sharp','grudge','haze'], look:{coat:0xd8d2c4,hat:'none',eye:0xffffff}}],
  alt:{n:'The Commissioner', s:'Owns the cops. Owns you.', hp:64, bag:['shaved','coin','loaded','loaded','pebble','pebble'], t:1, q:['loud'], boss:true, sig:'raid', short:'The Commissioner',
   d:'Every third round is a raid: your odds drop to 1.', sigT:'Every third round is a raid and your odds drop to 1. Every other round at half nerve.',
   half:{add:['sharp'],t:1,big:'Up against the wall',small:'Raids every other round, and Sharp'}, look:{coat:0x1a2236,hat:'cap',eye:0xffd27a,scale:1.35}}}];
// ---- a deeper bench: enough faces that no two runs meet the same people in the same order ----
const BENCH=[
 {t1:[{n:'Cousin Vinnie', s:'Owes everybody five bucks.',     hp:9,  bag:['d6','d6','d6','d6','d6','pebble'], t:2, q:['tax'], look:{coat:0x4a3a2a,hat:'cap',eye:0xffd27a}},
      {n:'Granny Mae',    s:'Knits between throws.',          hp:10, bag:['d6','d6','d6','d6','d6','d6'], t:2, q:['sloppy'], look:{coat:0x5a4a6a,hat:'none',eye:0xfff1c0}}],
  t2:[{n:'Slim Jim',      s:'All elbows.',                    hp:13, bag:['d6','d6','d6','d6','d6','loaded'], t:2, q:['fuse'], look:{coat:0x2a3a2a,hat:'fedora',eye:0x9ff5d3}},
      {n:'Dockside Rosie',s:'Hands like anchors.',            hp:14, bag:['loaded','pebble','d6','d6','d6','d6'], t:2, q:['heavy'], look:{coat:0x2a3a5a,hat:'headband',eye:0xffb070}}],
  e1:[{n:'The Kid',       s:'Too young to be in here.',       hp:14, bag:['pebble','d6','d6','d6','d6','d8'], t:2, q:['hot'], look:{coat:0x5a2a1a,hat:'cap',eye:0x9fd3ff,scale:1.05}}],
  e2:[{n:'Mister Smiles', s:'Grins the whole time.',          hp:21, bag:['loaded','loaded','pebble','d6','d6','d6'], t:2, q:['sharp','tax'], look:{coat:0x3a2a4a,hat:'top',eye:0xffe070,scale:1.15}}]},
 {t1:[{n:'Fingers Malone',s:'Counts cards. Wrong game.',      hp:16, bag:['loaded','pebble','d6','d6','d6','d6'], t:2, q:['steal'], look:{coat:0x3a3a3a,hat:'fedora',eye:0xc9f0ff}},
      {n:'Velma',         s:'Sings between rounds.',          hp:17, bag:['loaded','pebble','d6','d6','d6','d6'], t:2, q:['heavy'], look:{coat:0x7a1a3a,hat:'headband',eye:0xffa0d0}}],
  t2:[{n:'Rocco',         s:'Breaks thumbs on weekends.',     hp:21, bag:['loaded','loaded','pebble','d6','d6','d6'], t:1, q:['grudge','tax'], look:{coat:0x2a2420,hat:'fedora',eye:0xff8a5a}},
      {n:'Sister Grace',  s:'Prays for your dice.',           hp:21, bag:['loaded','loaded','pebble','d6','d6','coin'], t:2, q:['haze','edge'], look:{coat:0x18181e,hat:'veil',eye:0xf0f0ff}}],
  e1:[{n:'Ironjaw Pete',  s:'Never blinks first.',            hp:26, bag:['loaded','loaded','pebble','d6','d6','d6'], t:1, q:['fuse','sharp'], look:{coat:0x3a2a1a,hat:'cap',eye:0xff5470,scale:1.15}}],
  e2:[{n:'Madame Noir',   s:'Plays with a stranger’s money.', hp:25, bag:['loaded','loaded','pebble','pebble','d6','glass'], t:1, q:['cold','tax'], look:{coat:0x0e0e14,hat:'veil',eye:0xc9a0ff,scale:1.1}}]},
 {t1:[{n:'Benny Blue',    s:'Plays the horn. Badly.',         hp:25, bag:['loaded','loaded','pebble','coin','d6','d6'], t:1, q:['cold','tax'], look:{coat:0x1a2a5a,hat:'fedora',eye:0x8fd3ff}},
      {n:'Judge Harlan',  s:'Overrules your dice.',           hp:26, bag:['loaded','loaded','pebble','coin','d6','d6'], t:1, q:['sharp','nervous'], look:{coat:0x101010,hat:'none',eye:0xfff1c0}}],
  t2:[{n:'Lola Diamond',  s:'Wears her winnings.',            hp:29, bag:['loaded','loaded','pebble','pebble','coin','d6'], t:1, q:['steal','hot'], look:{coat:0xd8d2e4,hat:'headband',eye:0xa0e8ff}},
      {n:'Mack Cutter',   s:'Takes a cut of every pot.',      hp:30, bag:['loaded','loaded','pebble','pebble','d6','d6'], t:2, q:['copycat','tax'], look:{coat:0x2a1a1a,hat:'fedora',eye:0xff7a5a}}],
  e1:[{n:'The Undertaker',s:'Measures you for a box.',        hp:35, bag:['loaded','loaded','pebble','pebble','shaved','d6'], t:1, q:['grudge','heavy','cold'], look:{coat:0x0a0a0c,hat:'top',eye:0xb0ffb0,scale:1.2}}],
  e2:[{n:'Diamond Dolores',s:'Buys the table, then the room.',hp:37, bag:['shaved','loaded','loaded','pebble','pebble','coin'], t:1, q:['loud','steal'], look:{coat:0xe8e0f0,hat:'tiara',eye:0x9ff5ff,scale:1.2}}]}];
ACTS.forEach((A,i)=>['t1','t2','e1','e2'].forEach(k=>A.foes[k].push(...BENCH[i][k])));
const SIG0=['Once she’s at half nerve, she slams the table on your first throw each round: your two best dice get rerolled.','Swaps one of your dice for an Octo every round (two at half nerve).','Every tie goes to the opponent and hits you for 2.'];
ACTS.forEach((A,i)=>{ const f=A.foes, b=f.boss; b.short=A.short; b.d=A.bossD; b.half=A.half; b.sigT=SIG0[i];
  ['t1','t2','e1','e2'].forEach(k=>{ if(MORE[i][k]) f[k].push(...MORE[i][k]); }); f.bosses=[b,MORE[i].alt]; });
function bossOf(act,i){ return ACTS[act].foes.bosses[i||0]; }
// ---- Limits: raise the limit, the house raises the stakes. Each one stacks on the last. ----
const LIMITS=[
 {n:'Penny Ante',   d:'House rules. Nothing extra.'},
 {n:'Nickel',       d:'Everyone you face has 15% more nerve.'},
 {n:'Dime',         d:'Sharks and bosses bring an extra quirk.'},
 {n:'Quarter',      d:'Everything at the bar costs $1 more.'},
 {n:'Half Dollar',  d:'You walk in with 10 less nerve.'},
 {n:'Silver Dollar',d:'From Act II on, their odds are 1 higher.'},
 {n:'Gold Eagle',   d:'No breather on the stairs. The alley heals less.'},
 {n:'The Big Board',d:'Everyone has 30% more nerve. Tables pay $2 less.'}];
function limitMods(lv){ lv=lv||0; return {hp:lv>=7?1.3:lv>=1?1.15:1, extraQ:lv>=2, price:lv>=3?1:0, startHp:lv>=4?-10:0, odds:lv>=5?1:0, stairs:lv>=6?0:.5, rest:lv>=6?.25:.4, pay:lv>=7?-2:0}; }
const EXTRA_Q=['cold','fuse','haze','steal','grudge','hot','copycat','sharp','loud'];
// ---- who you walk in as ----
const POCKETS=[
 {k:'regular',n:'The Regular',d:'Six House Dice, two Octos, $8. The usual.',need:0},
 {k:'hustler',n:'The Hustler',d:'$22 in your pocket, but only 40 nerve.',need:1},
 {k:'gambler',n:'The Gambler',d:'Two High Rollers instead of Octos, and a Bent Spoon.',need:3},
 {k:'jeweler',n:'The Jeweler',d:'One House Die already has a ruby. Rubies start at $6.',need:5},
 {k:'heavy',  n:'The Heavy',  d:'60 nerve and Thick Skin, but only $2.',need:8}];
function pocketStart(k){ const P={hp:50,gold:8,bag:['d6','d6','d6','d6','d6','d6','d8','d8'],charms:[],gild:8,ruby:0};
  if(k==='hustler'){ P.gold=22; P.hp=40; } if(k==='gambler'){ P.bag=['d6','d6','d6','d6','d6','d6','gamble','gamble']; P.charms=['spoon']; }
  if(k==='jeweler'){ P.gild=6; P.ruby=1; } if(k==='heavy'){ P.hp=60; P.gold=2; P.charms=['thick']; } return P; }
// what they're really sitting on, after charms and quirks that move it
function theirScore(oRaw,R,charms,q){ let o=oRaw+(charms.includes('bouncer')?1:0)-(q.includes('edge')?1:0)+(q.includes('sloppy')?1:0);
  if(charms.includes('heckler')) o+=Math.min(2,R.crowns); if(q.includes('copycat')&&R.crowns) o-=1; return Math.max(0,o); }
const breaksAt=(type,charms)=>DT[type].breaks?DT[type].breaks+(charms.includes('glassblower')?2:0):0;
const bombDmg=max=>Math.max(2,Math.round(max*.08));
const isRaid=(opp,round,p2)=>opp.sig==='raid'&&round>0&&round%(p2?2:3)===0;
// floor pools: F table, E shark, S bar, R back alley, ? event, B boss
const FLOORS=[['F'],['F','?'],['F','E','?'],['R','?'],['F','E','?'],['F','E'],['F','?','E'],['R','?'],['B']];
const HAND=6;
// ---- scaling: each act is a new tier, like a new ante. HP grows geometrically, their odds climb. ----
// nerve at the top of each act for a regular / shark / boss. Regulars and sharks ramp up floor by floor.
const ACT_HP=[{F:13,E:30,B:52},{F:58,E:92,B:124},{F:150,E:185,B:335}];
const ACT_ODDS=[1,2,2.5];           // how hard their wins hit you
const LAP_HP=3;                     // endless: every lap triples nerve
function rnd(n){return Math.floor(Math.random()*n)}
function pick(a){return a[rnd(a.length)]}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function facesOf(d){ return (d&&d.f)||DT[typeof d==='string'?d:d.type].faces; }
function rollFace(type){return pick(DT[type].faces)}
function rollInst(d){ return pick(facesOf(d)); }
function effVal(face,ctx){ if(face==='C'||face==='G') return ctx&&ctx.cold?1:0; if(face===1&&ctx&&ctx.penny) return 0; return face; }
function aiKeep(faces,t){ const e=faces.map(f=>effVal(f)); let k=e.map((v,i)=>v<=t?i:-1).filter(i=>i>=0); if(!k.length){let m=0;e.forEach((v,i)=>{if(v<e[m])m=i});k=[m]} return k; }
function aiRound(bag,t){ let left=bag.map((_,i)=>i), throws=[], total=0;
  while(left.length){ const faces=left.map(i=>rollFace(bag[i])); const kl=aiKeep(faces,t); const kept=kl.map(k=>left[k]); kl.forEach(k=>total+=effVal(faces[k])); throws.push({left:left.slice(),faces,kept}); left=left.filter(i=>!kept.includes(i)); }
  return {throws,total}; }
function tierRef(act,kind){ const f=ACTS[act].foes, L=kind==='E'?[...f.e1,...f.e2]:kind==='B'?[f.boss]:[...f.t1,...f.t2]; return L.reduce((a,d)=>a+d.hp,0)/L.length; }
function oppHP(def,kind,act,floor,lap,easy){ const w=def.hp/tierRef(act,kind);
  return Math.max(4,Math.round(ACT_HP[act][kind]*w*(kind==='B'?1:1+.08*floor)*(easy?.72:1)*Math.pow(LAP_HP,lap))); }
function makeOpp(def,kind,act,floor,lap,easy,lv){ let bag=def.bag.slice(); for(let k=0;k<lap;k++){const i=bag.findIndex(b=>b==='d6'||b==='d8'); if(i>=0) bag[i]=k%2?'pebble':'loaded';}
  const LM=limitMods(lv), q=(def.q||[]).slice(); if(LM.extraQ&&(kind==='E'||kind==='B')){ const ex=EXTRA_Q.filter(x=>!q.includes(x)); if(ex.length) q.push(pick(ex)); }
  return {...def, hp:Math.round(oppHP(def,kind,act,floor,lap,easy)*LM.hp), odds:ACT_ODDS[act]+(kind==='B'?1:0)+lap+(act>=1?LM.odds:0), bag, q}; }
// ---- a round's running record; everything that pays is computed from this ----
function newRound(){ return {crowns:0,gilt:0,ember:0,roller:0,ones:0,threes:0,glass:0,gold:0,bomb:0,snake:false,singles:true,throws:0}; }
function bankVals(faces,ctx,charms,final){ let v=faces.map(f=>effVal(f,ctx));
  if(charms.includes('jacks')){ const s=new Set(); v=faces.map((f,i)=>{ if(s.has(f)) return 0; s.add(f); return v[i]; }); }
  if(final&&charms.includes('lastcall')){ let m=0; v.forEach((x,i)=>{ if(x>v[m]) m=i; }); if(v[m]>0) v[m]-=1; }
  return v; }
function noteBank(R,faces,types,charms){ R.throws++; if(faces.length!==1) R.singles=false;
  faces.forEach((f,i)=>{ if(f==='G'){ R.crowns++; R.gilt++; } if(f==='C'){ R.crowns++; if(types[i]==='ember') R.ember++; if(types[i]==='gamble') R.roller++; } });
  R.ones+=faces.filter(f=>f===1).length; if(faces.filter(f=>f===1).length>=2) R.snake=true;
  R.threes+=faces.filter(f=>f===3).length; R.glass+=types.filter(t=>t==='glass').length;
  faces.forEach((f,i)=>{ if(f==='C'&&types[i]==='gilded') R.gold++; if(f==='C'&&types[i]==='bomb') R.bomb++; }); }
// env: {gold, wins (rounds won in a row before this one), margin, score, done}
function oddsOf(R,charms,env){ const P=[]; let add=0, mul=1; const has=c=>charms.includes(c);
  const A=(l,n)=>{ if(n){ add+=n; P.push([l,'+'+n]); } }, M=(l,x)=>{ if(x!==1){ mul*=x; P.push([l,'×'+(+x.toFixed(1))]); } };
  if(env.rep) A('Reputation',env.rep);
  if(R.gilt) A('Ruby crowns',R.gilt);
  if(has('tally')) A('Tally Card',Math.floor((env.tally||0)/2));
  if(R.ember) A('Ember',2*R.ember);
  if(has('jewels')) A('Crown Jewels',R.crowns);
  if(has('slowburn')) A('Slow Burn',env.wins||0);
  if(has('snake')) A('Snake Eyes',R.ones);
  if(has('patience')&&R.singles&&R.throws>0&&env.done) A('One at a Time',4);
  if(has('barfly')) A('Bar Fly',Math.floor((env.gold||0)/6));
  if(has('packed')) A('Packed House',Math.floor((env.bag||0)/2));
  if(has('stack')) A('Short Stack',2*Math.max(0,9-(env.bag||9)));
  if(has('blood')) A('Blood Money',5);
  if(has('threes')) A('Three\u2019s Company',2*R.threes);
  if(has('glassblower')) A('Glassblower',2*R.glass);
  if(has('regular')) A('The Regular',Math.max(0,(env.round||1)-1));
  if(env.q&&env.q.includes('loud')){ add-=2; P.push(['Loudmouth','\u22122']); }
  if(R.roller) M('High Roller',Math.pow(2,R.roller));
  if(has('kingpin')&&R.crowns) M('Kingpin',Math.pow(1.25,R.crowns));
  if(has('closer')&&(env.margin||0)>=5) M('The Closer',1.5);
  if(has('lowball')&&env.done&&env.score<=2) M('Low Ball',1.5);
  if(has('opener')&&env.round===1) M('Opening Act',2);
  if(has('allin')&&env.done&&R.throws===1) M('All In',3);
  if(has('doubledown')&&(env.wins||0)>=1) M('Double Down',2);
  if(has('highstakes')) M('High Stakes',2);
  if(env.raid) return {odds:1, add:0, mul:1, parts:[['Raid! Odds forced to','=1']], raid:true};
  return {odds:Math.max(1,Math.max(1,1+add)*mul), add, mul, parts:P}; }
const fmtOdds=x=>(Math.round(x*10)/10).toString();
// final reckoning of a round
function settle(p,oRaw,R,charms,opp,env){ const q=opp.q, has=c=>charms.includes(c);
  const o=theirScore(oRaw,R,charms,q);
  if(p<o){ const margin=Math.max(1,o-p-(has('bouncer')?1:0))+(has('cut')?2:0); const O=oddsOf(R,charms,{...env,margin:o-p-(has('bouncer')?1:0),score:p,done:true});
    return {winner:'you',gap:o-p,margin,odds:O.odds,parts:O.parts,dmg:Math.max(1,Math.round(margin*O.odds)),oFinal:o,raid:O.raid}; }
  if(p===o+1&&has('nearmiss')) return {winner:'push',dmg:0,oFinal:o,near:true};
  const house=p===o&&opp.sig==='house', sharp=p===o&&!house&&q.includes('sharp');
  if(p>o||house||sharp){ const gap=house?2:sharp?1:p-o; let dmg=Math.ceil(gap*opp.odds);
    if(q.includes('hot')&&env.lossStreak>0) dmg+=env.lossStreak;
    if(q.includes('grudge')&&env.oppHalf) dmg+=2;
    if(has('thick')) dmg-=2; dmg=Math.max(1,dmg); if(has('highstakes')) dmg+=2;
    return {winner:'them',gap,dmg,odds:opp.odds,oFinal:o,house,sharp}; }
  return {winner:'push',dmg:0,oFinal:o}; }
// bar services that change a die for good
function fileDie(d){ const f=facesOf(d).slice(); let m=-1; f.forEach((x,i)=>{ if(typeof x==='number'&&(m<0||x>f[m])) m=i; }); if(m>=0&&f[m]>1) f[m]=1; d.f=f; return d; }
function gildDie(d){ const f=facesOf(d).slice(); let m=-1; f.forEach((x,i)=>{ if(typeof x==='number'&&(m<0||x>f[m])) m=i; }); if(m<0){ m=f.indexOf('C'); } if(m>=0) f[m]='G'; d.f=f; return d; }
const canFile=d=>facesOf(d).some(x=>typeof x==='number'&&x>1);
const canGild=d=>facesOf(d).some(x=>typeof x==='number'||x==='C');
// the map: two doors per floor, sometimes a third, so no two runs walk the same route
const EXTRA_STOPS=['F','?','E'];
function genFloors(){ return FLOORS.map((pool,f)=>{ const out=shuffle(pool).slice(0,Math.min(2,pool.length));
  if(f>0&&f<FLOORS.length-1&&Math.random()<.35){ const ex=shuffle(EXTRA_STOPS.filter(x=>!out.includes(x)&&!(f<2&&x==='E')))[0]; if(ex) out.push(ex); }
  return out; }); }
// shop and reward rarity climbs with the act: mostly commons in the Nail, rares turn up upstairs
function rollTier(act){ const r=Math.random(), a=Math.max(0,Math.min(2,act||0)); return r<[.7,.58,.48][a]?'c':r<[.995,.95,.9][a]?'u':'r'; }
/*LOGIC-END*/

if(typeof module!=='undefined'&&module.exports) module.exports={rollTier,ACT_HP,DT,SHOP_DICE,CHARMS,QUIRKS,ACTS,FLOORS,HAND,ACT_ODDS,rnd,pick,shuffle,facesOf,rollInst,rollFace,effVal,aiRound,makeOpp,newRound,bankVals,noteBank,oddsOf,settle,genFloors,fileDie,gildDie,canFile,canGild,LIMITS,limitMods,POCKETS,pocketStart,theirScore,breaksAt,bombDmg,isRaid,bossOf,EXTRA_Q};
