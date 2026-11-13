// Low Roller — game rules. Pure data and functions: no DOM, no Three.js.
// Loaded as a classic <script> by index.html (its top-level names are globals the game uses)
// and require()'d by the balance sim and unit tests through the export at the bottom.
/*LOGIC-START*/
const DT = {
  d6:     {name:'House Die',   short:'d6', skin:'bone',   faces:[1,2,3,4,5,'C'],              tier:'c', price:4,  desc:'The standard die. A crown scores 0.'},
  lead:   {name:'Lead Die',    short:'Pb', skin:'lead',   faces:[1,1,2,3,4,5],                tier:'x', price:0,  desc:'Cursed: it never shows a crown, and you can’t toss it.'},
  d8:     {name:'Octo',        short:'d8', skin:'octo',   faces:[1,2,3,4,5,6,7,'C'],          tier:'c', price:3,  desc:'Eight sides. Usually rolls high.'},
  pebble: {name:'Pebble',      short:'d4', skin:'pebble', faces:[1,2,3,'C'],                  tier:'u', price:10,  size:.46, desc:'Four sides, all low.'},
  loaded: {name:'Loaded Die',  short:'LD', skin:'loaded', faces:[1,1,2,3,4,'C'],              tier:'c', price:6,  desc:'Weighted low. Never rolls a 5.'},
  glass:  {name:'Glass Die',   short:'GL', skin:'glass',  faces:[1,1,1,2,'C','C'],            tier:'c', price:5,  breaks:3, desc:'Great faces, but it shatters after you draw it for 3 rounds.'},
  ember:  {name:'Ember',       short:'EM', skin:'ember',  faces:[1,2,3,4,5,6,'C','C'],        tier:'u', price:7,  desc:'Two crowns on eight sides. Bank a crown: you get +2 odds this round.'},
  devil:  {name:"Devil's Die", short:'−1', skin:'devil',  faces:[-1,2,3,4,5,'C'],             tier:'u', price:9,  desc:'One face is −1: it takes a point off your score.'},
  coin:   {name:'Lucky Coin',  short:'¢',  skin:'coin',   faces:[1,'C'],                      tier:'r', price:15, desc:'Only ever a 1 or a crown.'},
  twin:   {name:'Twin',        short:'TW', skin:'twin',   faces:[1,2,3,4,5,'C'],              tier:'r', price:11,  desc:'Copies your lowest other die in the same throw.'},
  gamble: {name:'High Roller', short:'12', skin:'gamble', faces:[1,2,3,4,5,6,7,8,9,10,11,'C'], tier:'c', price:6, size:.62, desc:'Mostly awful. Bank its crown: you get ×2 odds this round and $3.'},
  shaved: {name:'Shaved Die',  short:'SH', skin:'shaved', faces:[1,1,2,2,'C','C'],            tier:'r', price:16, desc:'Two 1s, two 2s, two crowns.'},
  gilded: {name:'Gilded Die',  short:'GD', skin:'gilded', faces:[1,2,3,4,5,'C'],              tier:'u', price:9,  desc:'Bank its crown: you get $2.'},
  bomb:   {name:'Cherry Bomb', short:'CB', skin:'bomb',   faces:[1,2,3,4,5,'C'],              tier:'u', price:8,  desc:'Bank its crown: the opponent loses 8% of their max nerve on the spot (at least 2).'},
  goose:  {name:'Goose Egg',   short:'00', skin:'goose',  faces:[0,4,5,6,6,'C'],              tier:'c', price:5,  desc:'One face is 0. The rest run high.'},
  boxcar: {name:'Boxcars',     short:'BX', skin:'boxcar', faces:[1,1,1,6,6,'C'],              tier:'c', price:6,  desc:'Three 1s, two 6s. Pairs well with Snake Eyes.'},
  royal:  {name:'Royal Die',   short:'RY', skin:'royal',  faces:['C','C','C',4,5,6],          tier:'r', price:13,  desc:'Three crowns, three high faces. Feast or famine.'},
  deuce:  {name:'Deuce',       short:'22', skin:'deuce',  faces:[2,2,2,2,3,'C'],              tier:'c', price:5,  desc:'Four 2s. Pairs with Deuces Wild.'},
  payday: {name:'Payday',      short:'$1', skin:'payday', faces:[1,2,3,4,5,'C'],              tier:'u', price:7,  desc:'Bank its 1: you get $1.'},
  trick:  {name:'Trick Die',   short:'TR', skin:'trick',  faces:[-1,3,6,6,6,'C'],             tier:'u', price:8,  desc:'Half the time it’s a 6. The −1 takes a point off your score.'},
  bubbly: {name:'Champagne',   short:'CH', skin:'bubbly', faces:[1,2,3,4,5,'C'],              tier:'u', price:9,  desc:'Bank its crown: you get ×1.5 odds this round. Stacks.'},
  // ---- the second case of dice ----
  tin:    {name:'Tin Die',     short:'TN', skin:'tin',    faces:[1,2,2,3,3,4],                tier:'c', price:5,  desc:'Never above a 4. No crown either.'},
  sandbag:{name:'Sandbag',     short:'33', skin:'sandbag',faces:[3,3,3,3,3,3],                tier:'c', price:4,  desc:'Always a 3. Pairs with Three’s Company and Three of a Kind.'},
  rust:   {name:'Rusty Die',   short:'RS', skin:'rust',   faces:[1,2,3,4,5,'C'],              tier:'c', price:4,  breaks:5, desc:'Bank it: you get $1. It falls apart after you draw it for 5 rounds.'},
  seven:  {name:'Lucky Seven', short:'7',  skin:'seven',  faces:[1,1,2,2,3,3,7,'C'],          tier:'c', price:6,  desc:'Eight sides, mostly low. One ugly 7.'},
  ivory:  {name:'Ivory',       short:'IV', skin:'ivory',  faces:[1,2,2,3,3,'C'],              tier:'u', price:9,  desc:'Never above a 3.'},
  coronet:{name:'Coronet',     short:'CR', skin:'coronet',faces:[1,2,3,4,'C','C'],            tier:'u', price:9,  desc:'Two crowns, no 5.'},
  mercury:{name:'Quicksilver', short:'QS', skin:'mercury',faces:[1,2,3,4,5,'C'],              tier:'u', price:8,  desc:'Bank it on your first throw: you get +3 odds this round.'},
  jade:   {name:'Jade Die',    short:'JD', skin:'jade',   faces:[1,3,3,3,5,'C'],              tier:'u', price:8,  desc:'Three 3s. Bank its 3: you get +3 odds this round.'},
  iron:   {name:'Iron Die',    short:'FE', skin:'iron',   faces:[2,2,3,3,4,'C'],              tier:'u', price:8,  desc:'Bank it: you get +2 Guard.'},
  saint:  {name:'Saint’s Die', short:'ST', skin:'saint',  faces:[1,2,3,4,5,'C'],              tier:'u', price:8,  desc:'Bank its crown: you heal 3 nerve.'},
  slot:   {name:'One-Armed Bandit',short:'$5',skin:'slot',faces:[1,2,3,4,5,6,7,'C'],          tier:'u', price:7,  desc:'Eight sides. Bank its crown: you get $5.'},
  magnet: {name:'Magnet',      short:'MG', skin:'magnet', faces:[1,2,3,4,5,'C'],              tier:'u', price:8,  desc:'Bank it with another die showing the same face: you get +4 odds this round.'},
  nickel: {name:'Wooden Nickel',short:'5¢',skin:'nickel', faces:[2,'C'],                      tier:'u', price:9,  desc:'Only ever a 2 or a crown.'},
  chip:   {name:'Poker Chip',  short:'07', skin:'chip',   faces:[0,7],                        tier:'u', price:8,  desc:'Heads it’s a 0. Tails it’s a 7.'},
  blank:  {name:'Blank Check', short:'09', skin:'blank',  faces:[0,0,0,9,9,9],                tier:'u', price:8,  desc:'Half 0s, half 9s. No crown.'},
  potato: {name:'Hot Potato',  short:'HP', skin:'potato', faces:[1,1,1,2,2,'C'],              tier:'u', price:7,  burn:1, desc:'Great faces. Every round you draw it, you lose 1 nerve (never your last).'},
  anvil:  {name:'Anvil',       short:'AN', skin:'anvil',  faces:[4,5,6,6,'C','C'],            tier:'r', price:12, desc:'Bank it showing 4 or more: you get ×1.5 odds this round. Stacks.'},
  onyx:   {name:'Onyx',        short:'OX', skin:'onyx',   faces:[0,0,1,2,5,6],                tier:'r', price:14, desc:'Two 0s, a 1 and a 2. No crown.'},
  rattler:{name:'Rattler',     short:'11', skin:'rattler',faces:[1,1,1,1,1,6],                tier:'r', price:14, desc:'Five 1s and one 6. No crown.'},
  moon:   {name:'Moonstone',   short:'MN', skin:'moon',   faces:[1,2,3,4,5,'C'],              tier:'r', price:13, desc:'Bank it in your last bank of the round: you get ×2 odds.'},
  dynamite:{name:'Dynamite',   short:'TNT',skin:'dynamite',faces:[1,2,3,4,5,'C'],             tier:'r', price:12, breaks:4, desc:'Bank its crown: the opponent loses 16% of their max nerve on the spot. Gone after you draw it for 4 rounds.'},
  viper:  {name:'Viper',       short:'VP', skin:'viper',  faces:[1,1,'C',5,6,6],              tier:'r', price:12, desc:'Bank its 1: you get ×1.5 odds this round. Stacks.'},
};
// Finishes: a die can carry one. Shown as a colored rim on the die and a tag on its card.
const FINISHES={
  polished:{name:'Polished',    col:'#9fe8ff', desc:'Bank it: you get +2 odds this round.'},
  goldleaf:{name:'Gold Leaf',   col:'#f0c040', desc:'Bank it showing a 1 or a crown: you get $1.'},
  lucky:   {name:'Lucky',       col:'#7ae08a', desc:'Bank it: 1 in 3 chance of +4 odds this round.'},
  chrome:  {name:'Chrome',      col:'#e8e8f4', desc:'Bank it: you get ×1.25 odds this round.'},
  feather: {name:'Featherweight',col:'#d8c0ff', desc:'Its 1s score 0.'},
  marked:  {name:'Marked',      col:'#ff8a5a', desc:'Bank it: everything that counts its face counts it twice (crowns, 1s, Plays, charms).'},
  sterling:{name:'Sterling',    col:'#b8c4d8', desc:'Bank it: you get +1 Guard.'},
  inked:   {name:'Inked',       col:'#5a6ad8', desc:'Its crowns count as two crowns.'},
  weighted:{name:'Weighted',    col:'#a07848', desc:'Its 5s and higher score 1 less.'},
  blessed: {name:'Blessed',     col:'#fff0a8', desc:'Bank it: you heal 1 nerve.'},
};
const FIN_KEYS=Object.keys(FINISHES);
// is this die's Lucky finish hitting this round? fixed per round seed + die, so a reload can't fish for it
function luckyHit(seed,uid){ let x=((seed>>>0)^Math.imul((uid|0)+1,2654435761))>>>0; x^=x>>>15; x=Math.imul(x,0x2c1b3c6d)>>>0; x^=x>>>12; return (x%3)===0; }
const SHOP_DICE=['tin','sandbag','rust','seven','ivory','coronet','mercury','jade','iron','saint','slot','magnet','nickel','chip','blank','potato','anvil','onyx','rattler','moon','dynamite','royal','deuce','payday','trick','bubbly','viper','pebble','loaded','glass','ember','devil','coin','twin','gamble','gilded','bomb','goose','boxcar','shaved'];
// tier: c common · u uncommon · r rare.  Odds math: (1 + every +odds) × every ×odds
const CHARMS={
  jewels:  {name:'Crown Jewels',  ico:'♛', tier:'c', price:6, desc:'You get +1 odds per crown you bank.'},
  slowburn:{name:'Slow Burn',     ico:'≈', tier:'c', price:6, desc:'You get +1 odds per round you’ve won in a row at this table.'},
  cut:     {name:"Dealer's Cut",  ico:'%', tier:'c', price:5, desc:'When you win a round, your “ahead by” counts 2 higher.'},
  bouncer: {name:'The Bouncer',   ico:'B', tier:'u', price:10, desc:'The opponent’s score counts 1 higher, so you win ties. Doesn’t make your hits bigger.'},
  thick:   {name:'Thick Skin',    ico:'T', tier:'c', price:5, desc:'Rounds you lose hit you 3 less (at least 1).'},
  tip:     {name:'Tip Jar',       ico:'$', tier:'c', price:5, desc:'You get $2 for every round you win.'},
  goldcrown:{name:'Gold Tooth',   ico:'¢', tier:'c', price:5, desc:'You get $1 per crown you bank.'},
  hothand: {name:'Hot Hand',      ico:'♥', tier:'c', price:5, desc:'You heal 1 nerve per crown you bank.'},
  liver:   {name:'Iron Liver',    ico:'+', tier:'c', price:6, hp:12, desc:'You get +12 max nerve.'},
  cigar:   {name:'Victory Cigar', ico:'V', tier:'c', price:5, desc:'You heal 6 nerve after every fight you win.'},
  penny:   {name:'Lucky Penny',   ico:'1', tier:'r', price:17, rare:true, desc:'Your first throw each round: your 1s score 0.'},
  spoon:   {name:'Bent Spoon',    ico:'↻', tier:'u', price:9,  desc:'Once per round: pick one of your dice and reroll it.'},
  lastcall:{name:'Last Call',     ico:'L', tier:'r', price:16, rare:true, desc:'Your final bank each round: its highest die counts 1 less, if it’s a 4 or more.'},
  jacks:   {name:'Pair of Jacks', ico:'J', tier:'u', price:9,  desc:'In each bank you make, repeat faces score 0. (3, 3, 5 counts as 3 + 0 + 5.)'},
  snake:   {name:'Snake Eyes',    ico:'∴', tier:'u', price:9,  desc:'You get +1 odds per 1 you bank.'},
  patience:{name:'One at a Time', ico:'I', tier:'u', price:10, desc:'Bank exactly one die every throw for a whole round: you get +4 odds.'},
  barfly:  {name:'Bar Fly',       ico:'b', tier:'u', price:9,  desc:'You get +1 odds per $6 you’re holding.'},
  tally:   {name:'Tally Card',    ico:'#', tier:'u', price:8,  desc:'You get +1 odds per 2 fights you’ve won while holding this.'},
  rabbit:  {name:"Rabbit's Foot", ico:'R', tier:'u', price:9,  desc:'The first round you lose at each table doesn’t hurt you.'},
  closer:  {name:'The Closer',    ico:'C', tier:'u', price:12, desc:'Win a round by 5 or more: you get ×2 odds.'},
  kingpin: {name:'Kingpin',       ico:'K', tier:'r', price:18, rare:true, desc:'You get ×1.35 odds per crown you bank. Stacks.'},
  lowball: {name:'Low Ball',      ico:'0', tier:'r', price:16, rare:true, desc:'Finish a round on 3 or less: you get ×3 odds.'},
  opener:  {name:'Opening Act',   ico:'O', tier:'c', price:6, desc:'Your first round at each table: you get ×2 odds.'},
  packed:  {name:'Packed House',  ico:'P', tier:'c', price:6, desc:'You get +1 odds per 2 dice in your bag.'},
  stack:   {name:'Short Stack',   ico:'S', tier:'u', price:9, desc:'You get +2 odds per die your bag is short of 9.'},
  allin:   {name:'All In',        ico:'A', tier:'u', price:10, desc:'Bank every die on your first throw: you get ×3 odds.'},
  glassblower:{name:'Glassblower',ico:'G', tier:'c', price:5, desc:'You get +2 odds per Glass Die you bank. Your Glass Dice last 2 more rounds.'},
  nearmiss:{name:'Near Miss',     ico:'N', tier:'c', price:5, desc:'You lose a round by exactly 1: nobody gets hit.'},
  blood:   {name:'Blood Money',   ico:'D', tier:'u', price:8, desc:'You get +6 odds. You lose 1 nerve every round (never your last).'},
  threes:  {name:'Three\u2019s Company',ico:'3', tier:'c', price:5, desc:'You get +2 odds per 3 you bank.'},
  regular: {name:'The Regular',   ico:'r', tier:'u', price:9, desc:'You get +1 odds per round already played at this table.'},
  heckler: {name:'The Heckler',   ico:'H', tier:'u', price:10, desc:'Your first crown each round adds 1 to the opponent’s score.'},
  doubledown:{name:'Double Down', ico:'2', tier:'r', price:16, rare:true, desc:'Won your last round at this table: you get ×3 odds.'},
  highstakes:{name:'High Stakes', ico:'×', tier:'r', price:15, rare:true, desc:'You get ×2 odds, but rounds you lose hit you 1 harder.'},
  bookie:  {name:'The Bookie',    ico:'§', tier:'r', price:15, rare:true, desc:'Win a round: you get $1 per point you won by, up to $8.'},
  // builds: more charms = more odds; streaks that grow; three of a kind; straights; even faces; crowns going negative
  collection:{name:'The Collection',ico:'≡', tier:'c', price:5, desc:'You get +4 odds per charm you hold (this one too).'},
  consolation:{name:'Consolation',  ico:'♥', tier:'c', price:4, desc:'Lose a round: you get $2 (not when Rabbit’s Foot takes the hit).'},
  savings: {name:'Savings Bond',  ico:'%', tier:'c', price:6, desc:'Win a fight: you get $1 per $10 you’re holding (up to $5).'},
  shiner:  {name:'Shiner',        ico:'○', tier:'c', price:5, desc:'Finish a round without banking a crown: you get +6 odds.'},
  evens:   {name:'Even Money',    ico:'2', tier:'c', price:5, desc:'You get +2 odds per 2, 4 or 6 you bank.'},
  deuces:  {name:'Deuces Wild',   ico:'2', tier:'u', price:9, desc:'Your 2s score 1.'},
  flask:   {name:'Hip Flask',     ico:'F', tier:'c', price:5, desc:'You sit down at every table with 6 Guard.'},
  bulldog: {name:'The Bulldog',   ico:'D', tier:'u', price:8, desc:'You get +1 Guard for every 1 you bank.'},
  haymaker:{name:'Haymaker',      ico:'H', tier:'r', price:15, rare:true, desc:'You sit down at every table with 4 Guard. Win a round: you win it by 1 more per Guard you have.'},
  mimic:   {name:'The Mimic',     ico:'M', tier:'r', price:15, rare:true, desc:'Copies whatever the charm to its right does, so it works twice. Drag charms to set the order.'},
  thumb:   {name:'Loaded Thumb',  ico:'T', tier:'u', price:9, desc:'Twice per table: click Nudge, then a die in your tray, to turn it down by 1. Crowns don’t move.'},
  echo:    {name:'The Echo',      ico:'E', tier:'u', price:9, desc:'Crowns you bank on your first throw of a round count as two crowns each.'},
  doubletake:{name:'Double Take', ico:'D', tier:'u', price:8, desc:'Every 1 you bank counts as two 1s (for Snake Eyes and Pair of Ones).'},
  sleight: {name:'Sleight of Hand',ico:'S', tier:'r', price:15, rare:true, desc:'Your first throw each round: every die that lands on 5 or more gets one free rethrow.'},
  bump:    {name:'Bump the Table',ico:'B', tier:'u', price:8, desc:'Once per table, after they throw: click Bump and their lowest die gets thrown again.'},
  bodyguard:{name:'The Bodyguard',ico:'G', tier:'u', price:9, desc:'You get +3 Guard every round you win.'},
  piggy:   {name:'Piggy Bank',    ico:'P', tier:'u', price:8, desc:'Grows +2 odds every round you win. Breaks back to 0 when you lose one (unless Rabbit’s Foot takes the hit).'},
  tommy:   {name:'Tommy Gun',     ico:'⁞', tier:'u', price:8, desc:'You get +2 odds per die in your final bank each round.'},
  jackpot: {name:'Jackpot',       ico:'7', tier:'u', price:9, desc:'Bank three of a kind in one go: you get ×2 odds this round.'},
  longshot:{name:'Long Shot',     ico:'1', tier:'u', price:8, desc:'Win a round by 1 or 2: you get ×2.5 odds.'},
  finisher:{name:'The Finisher',  ico:'F', tier:'u', price:9, desc:'Opponent at half nerve or less: you get ×2.5 odds.'},
  moonshine:{name:'Moonshine',    ico:'M', tier:'r', price:16, rare:true, desc:'Ferments: gains ×0.05 odds every round you win. Never resets.'},
  crownroom:{name:'The Crown Room',ico:'♛', tier:'r', price:16, rare:true, desc:'Bank 3 or more crowns in a round: you get ×3 odds.'},
  straight:{name:'Straight Shooter',ico:'S', tier:'r', price:15, rare:true, desc:'Bank a 1, a 2 and a 3 in the same round: you get ×5 odds.'},
  ringer:  {name:'The Ringer',    ico:'R', tier:'r', price:17, rare:true, desc:'Your crowns score −1 instead of 0, but your 1s score 3.'},
  shoeshine:{name:'Shoeshine',   ico:'✦', tier:'u', price:8, desc:'Your finished dice give +2 more odds when you bank them.'},
  curator: {name:'The Curator',  ico:'❖', tier:'u', price:8, desc:'You get +2 odds per die in your bag with a finish.'},
  restless:{name:'Restless',     ico:'↻', tier:'c', price:5, desc:'Grows +2 odds every time you restock the bar. Never resets.'},
  craterat:{name:'Crate Rat',    ico:'▣', tier:'u', price:7, desc:'Grows +3 odds every crate you open. Never resets.'},
  stub:    {name:'Ticket Stub',  ico:'▭', tier:'c', price:5, desc:'You get +2 odds per chit you’ve earned this run.'},
  rabbitp: {name:'Rabbit Punch', ico:'✚', tier:'r', price:15, rare:true, desc:'Your Lucky dice hit every time, and give +6 instead of +4.'},
  // ---- the second shelf: more ways to build ----
  twostep: {name:'Two-Step',      ico:'2', tier:'c', price:5, desc:'You get +2 odds per 2 you bank.'},
  oddball: {name:'Odd Man Out',   ico:'5', tier:'c', price:5, desc:'You get +2 odds per 1, 3 or 5 you bank.'},
  aces:    {name:'Aces Up',       ico:'A', tier:'c', price:5, desc:'You get +2 odds per 1 you bank on your first throw of a round.'},
  bigbank: {name:'Heavy Pour',    ico:'4', tier:'c', price:5, desc:'Bank 4 or more dice in one go: you get +5 odds this round.'},
  eightball:{name:'Eight Ball',   ico:'8', tier:'c', price:5, desc:'You get +3 odds per eight-sided die you bank.'},
  purist:  {name:'House Rules',   ico:'H', tier:'c', price:6, desc:'You get +2 odds per House Die you bank.'},
  bully:   {name:'The Bully',     ico:'B', tier:'c', price:5, desc:'At a regular’s table (not a shark or an owner): you get +5 odds.'},
  firstblood:{name:'First Blood', ico:'F', tier:'c', price:5, desc:'While the opponent is at full nerve: you get +6 odds.'},
  fullstomach:{name:'Full Stomach',ico:'♥', tier:'c', price:5, desc:'While you’re at full nerve: you get +5 odds.'},
  welldrinks:{name:'Well Drinks', ico:'w', tier:'c', price:5, desc:'You get +2 odds per common charm you hold (this one too).'},
  deepbreath:{name:'Deep Breath', ico:'~', tier:'c', price:5, desc:'You heal 2 nerve every round you win.'},
  doorman: {name:'The Doorman',   ico:'D', tier:'c', price:5, desc:'You get +2 Guard at the end of every round, win or lose.'},
  barback: {name:'The Barback',   ico:'b', tier:'c', price:5, desc:'Your coat holds one more drink.'},
  fence:   {name:'The Fence',     ico:'f', tier:'c', price:4, desc:'Charms sell for full price, and tossing a die costs $3 less.'},
  lonewolf:{name:'Lone Wolf',     ico:'1', tier:'u', price:8, desc:'You get +2 odds every time you bank exactly one die.'},
  marathon:{name:'Long Night',    ico:'L', tier:'u', price:8, desc:'You get +1 odds per throw you’ve banked from this round.'},
  quickdraw:{name:'Quick Draw',   ico:'Q', tier:'u', price:8, desc:'Finish a round in 2 throws or fewer: you get +6 odds.'},
  rainbow: {name:'Mixed Drinks',  ico:'M', tier:'u', price:8, desc:'You get +2 odds per different kind of die you bank in a round.'},
  highroad:{name:'The High Road', ico:'6', tier:'u', price:8, desc:'You get +3 odds per 5 or higher you bank.'},
  zero:    {name:'Nothing Doing', ico:'0', tier:'u', price:8, desc:'You get +4 odds per 0 or −1 you bank.'},
  coronation:{name:'Coronation',  ico:'♛', tier:'u', price:9, desc:'Bank 2 or more crowns in one go: you get +6 odds this round.'},
  evensteven:{name:'Even Steven', ico:'=', tier:'u', price:8, desc:'Finish a round on an even score: you get +4 odds.'},
  broke:   {name:'Empty Pockets', ico:'0', tier:'u', price:7, desc:'While you’re holding $5 or less: you get +8 odds.'},
  brickwall:{name:'Brick Wall',   ico:'W', tier:'u', price:8, desc:'You get +1 odds per 2 Guard you have.'},
  happyhour:{name:'Happy Hour',   ico:'Y', tier:'u', price:8, desc:'You get +3 odds per drink in your coat.'},
  topshelf:{name:'Top Shelf',     ico:'T', tier:'u', price:9, desc:'You get +3 odds per rare charm you hold.'},
  showman: {name:'The Showman',   ico:'S', tier:'u', price:9, desc:'You get +3 odds per Play you make in a round.'},
  closingtime:{name:'Closing Time',ico:'C', tier:'u', price:9, desc:'From round 4 on at a table: you get ×2 odds.'},
  giantkiller:{name:'Giant Killer',ico:'G', tier:'u', price:9, desc:'Against sharks and owners: you get ×1.5 odds.'},
  comeback:{name:'Comeback Kid',  ico:'K', tier:'u', price:9, desc:'Lost your last round at this table: you get ×2.5 odds.'},
  adrenaline:{name:'Adrenaline',  ico:'!', tier:'u', price:9, desc:'While you’re at half nerve or less: you get ×2 odds.'},
  pokerface:{name:'Poker Face',   ico:'P', tier:'u', price:8, desc:'Any round they’re Leaning in or Counting crowns: you get ×2 odds.'},
  nightcap:{name:'Nightcap',      ico:'N', tier:'u', price:8, desc:'Any round you have a drink: you get ×1.5 odds.'},
  wheel:   {name:'Wheel of Fortune',ico:'✺', tier:'u', price:8, desc:'Every round: 1 in 3 chance you get ×3 odds.'},
  heavyweight:{name:'Heavyweight',ico:'W', tier:'r', price:15, rare:true, desc:'Win a round while finishing on 10 or more: you get ×3 odds.'},
  sevens:  {name:'Sevens',        ico:'7', tier:'r', price:15, rare:true, desc:'Finish a round on exactly 7: you get ×4 odds.'},
  sweep:   {name:'Clean Sweep',   ico:'0', tier:'r', price:16, rare:true, desc:'Finish a round on 0 or less: you get ×4 odds.'},
  snakepit:{name:'Snake Pit',     ico:'∴', tier:'r', price:17, rare:true, desc:'You get ×1.2 odds per 1 you bank. Stacks.'},
  sixgun:  {name:'Six-Shooter',   ico:'6', tier:'r', price:15, rare:true, desc:'Bank a 6 or higher in a round: you get ×2 odds.'},
  regicide:{name:'No Kings',      ico:'x', tier:'r', price:15, rare:true, desc:'Finish a round without banking a crown: you get ×2 odds.'},
  midas:   {name:'Midas',         ico:'$', tier:'r', price:17, rare:true, desc:'You get ×1.1 odds per $10 you’re holding, up to ×2.'},
  glassjaw:{name:'Glass Jaw',     ico:'J', tier:'r', price:15, rare:true, hp:-15, desc:'You get ×2.5 odds. −15 max nerve.'},
  travellight:{name:'Travel Light',ico:'t', tier:'r', price:16, rare:true, desc:'You get ×1.25 odds per die your bag is short of 8. Stacks.'},
  lonestar:{name:'Lone Star',     ico:'★', tier:'r', price:16, rare:true, desc:'You get +7 odds per empty charm slot.'},
  practice:{name:'Practice Makes',ico:'p', tier:'r', price:15, rare:true, desc:'Your Plays level up every 3rd time you make them instead of every 4th.'},
  bigshot: {name:'Big Shot',      ico:'★', tier:'r', price:16, rare:true, desc:'You get ×1.2 odds per charm you hold (this one too).'},
};
const TIER_NAME={c:'Common',u:'Uncommon',r:'Rare'};
const MAX_CHARMS=5;
// "Off the Books": a rare shop tag. The charm works as normal but doesn't take one of your 5 slots.
const OFFBOOK_P=.015, OFFBOOK_FEE=5;
function offbook(G,c){ return !!(G.offbook&&G.offbook.includes(c)); }
function offbookP(G){ return OFFBOOK_P*(hasFix(G,'ledger')?3:1); }
function slotsUsed(G){ return G.charms.filter(c=>!offbook(G,c)).length; }
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
  // counters: what bosses and sharks bring to stop a build that's gotten out of hand
  ironjaw:{name:'Iron Jaw',     desc:'No single round can take more than a third of the opponent’s max nerve.'},
  flat: {name:'Flat Rate',      desc:'Your × odds don’t count here. Only + odds.'},
  vig:  {name:'The Vig',        desc:'Your odds are cut in half (rounded down, never under 1).'},
  jinx: {name:'Jinx',           desc:'Each round, one of your charms is switched off.'},
  armor:{name:'Bulletproof Vest',desc:'The first round you win at this table does no damage.'},
  bloodlust:{name:'Bloodlust',  desc:'The opponent’s odds go up by 1 every other round of the fight.'},
  regen:{name:'Second Wind',    desc:'The opponent gets back 3% of their max nerve after every round.'},
  crownless:{name:'No Royals',  desc:'Your crowns score 1 instead of 0.'},
  snakebit:{name:'Snakebit',    desc:'Your first throw each round: your 1s score 2.'},
  thorns:{name:'Brass Knuckles',desc:'Every round you win, a tenth of the damage comes back at you (1 to 5).'},
  // ---- a rougher crowd ----
  threes4:{name:'Odd Job',      desc:'Your 3s score 4.'},
  lastword:{name:'Last Word',   desc:'Your final bank each round scores 1 more.'},
  crowntax:{name:'Crown Tax',   desc:'Every crown you bank costs you $1, paid when the round ends.'},
  thickhide:{name:'Thick Hide', desc:'Rounds you win by 2 or less only hit half as hard.'},
  stoneface:{name:'Stone Face', desc:'You can’t see what they’re up to next round.'},
  short:{name:'Short Table',    desc:'You draw one die fewer every round.'},
  lid:  {name:'Tight Lid',      desc:'The opponent’s score never counts higher than 8.'},
  generous:{name:'Big Tipper',  help:true, desc:'You get $1 every round you win here.'},
  soft: {name:'Soft Touch',     help:true, desc:'Rounds you win here hit a quarter harder.'},
};
// Balatro-style boss blinds / Spire-style elites: every boss and most sharks draw a counter at random each run,
// so a build that one-shots one table has to deal with something different at the next.
const BOSS_RULES=[['armor','regen','bloodlust','snakebit','lastword'],['ironjaw','jinx','armor','bloodlust','regen','snakebit','thorns','vig','thickhide','threes4'],['jinx','flat','vig','thorns','bloodlust','regen','snakebit','thickhide','lastword']];
const SHARK_RULES=['armor','regen','jinx','snakebit','thorns','bloodlust','thickhide','lastword'], SHARK_RULES_1=['regen','snakebit','thorns','bloodlust','lastword'];
const RULE_Q=[...new Set(['ironjaw',...BOSS_RULES.flat(),...SHARK_RULES,...SHARK_RULES_1])];
function rulesFor(kind,act,lap,q){ const add=[], take=pool=>{ const ok=pool.filter(x=>!q.includes(x)&&!add.includes(x)); if(ok.length) add.push(pick(ok)); };
  if(kind==='B'){ if(lap>0) add.push('ironjaw'); take(BOSS_RULES[act]); if(act===2&&!lap) take(BOSS_RULES[2]); for(let k=0;k<lap;k++) take(BOSS_RULES[2]); }
  if(kind==='E'){ take(act===0&&!lap?SHARK_RULES_1:SHARK_RULES); for(let k=0;k<lap;k++) take(SHARK_RULES); }
  return add; }
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
    {n:'Tipsy Tina',s:'Hand in your pocket.',       hp:13, bag:['d6','d6','d6','d6','d6','loaded'], t:2, q:['steal'], look:{coat:0x6b1f35,hat:'cloche',eye:0xff8fb0}},
    {n:'Lefty',        s:'Deals with his right.',      hp:12, bag:['d6','d6','d6','d6','d6','loaded'], t:2, q:['cold'], look:{coat:0x1f2f45,hat:'fedora',eye:0x8fd3ff,mustache:true}},
    {n:'Dutch',        s:'Bets the deed.',             hp:15, bag:['loaded','loaded','pebble','d6','d6','d6'], t:2, q:['grudge'], look:{coat:0x3d2a1a,hat:'fedora',eye:0xffb547,band:0x2a4a6a}}],
  e1:[{n:'Knuckles',   s:'Bouncer. Off the clock.',    hp:15, bag:['d6','d6','d6','d6','d6','loaded'], t:2, q:['fuse'], look:{coat:0x222222,hat:'cap',eye:0xff5470,scale:1.15}}],
  e2:[
    {n:'Pearl',        s:'Never blinks.',              hp:20, bag:['pebble','pebble','loaded','d6','d6','d6'], t:2, q:['haze','steal'], look:{coat:0xd8d2c4,hat:'cloche',eye:0xff5470}},
    {n:'The Twins',    s:'Finish each other’s rolls.', hp:17, bag:['loaded','loaded','pebble','d6','d6','glass'], t:2, q:['pair'], look:{coat:0x2b2440,hat:'bowler',eye:0xc9a0ff,scale:1.1}}],
  boss:{n:'Big Sal', s:'Owns the Rusty Nail', hp:32, bag:['loaded','loaded','d6','d6','d6','pebble'], t:2, q:['edge'], boss:true, sig:'slam', look:{coat:0x5a1520,hat:'fedora',eye:0xffb547,scale:1.3,cigar:true,band:0xc9a14a,tie:0x1a1a1a}}}},
 {name:'The Velvet Room', boss:'The Countess', short:'The Countess', bossD:'She runs the room upstairs. Every round she swaps one of your dice for an Octo.', est:'MEMBERS ONLY',
  theme:{felt:'#5c1e30',trim:'#d8b25c',wall:'#3a0c16',pat:'#b8903f',style:'diamond',lamp:0xffb89a,neon:'VELVET',neonC:'#b04aff',neonT:'#e8c4ff'},
  half:{add:['edge'],t:1,big:'The gloves come off',small:'Two swaps a round, and House Edge',note:'Every round she swaps one of your dice for an Octo. At half nerve it’s two, and she adds House Edge.'},
  foes:{
  t1:[
    {n:'Silky Vince', s:'Smells like money.',         hp:16, bag:['loaded','d6','d6','d6','pebble','d6'], t:2, q:['tax'], look:{coat:0x3a1030,hat:'fedora',eye:0xff9ad0}},
    {n:'Madame Ora',   s:'Already knows your roll.',   hp:17, bag:['glass','d6','d6','loaded','d6','d6'], t:2, q:['haze'], look:{coat:0x2a1a3a,hat:'cloche',hatc:0x4a1a4a,eye:0xc9a0ff}},
    {n:'Dot',s:'Sells smokes, steals change.',hp:17, bag:['d6','d6','loaded','pebble','d6','d6'], t:2, q:['steal','nervous'], look:{coat:0x7a1c2a,hat:'cloche',eye:0xffd27a}}],
  t2:[
    {n:'The Professor',s:'Counts on his fingers. Fast.',hp:20, bag:['loaded','loaded','pebble','d6','d6','d6'], t:1, q:['fuse'], look:{coat:0x2a2a2a,hat:'bowler',eye:0x9ff5d3,mustache:true}},
    {n:'Vito',         s:'Smiles with his mouth only.', hp:21, bag:['loaded','loaded','d6','d6','d6','pebble'], t:1, q:['edge'], look:{coat:0x1a1a2a,hat:'fedora',eye:0xff5470}},
    {n:'Mr. Velvet',   s:'Named the room after himself.',hp:22, bag:['loaded','pebble','pebble','d6','d6','d6'], t:1, q:['cold','hot'], look:{coat:0x5a0f1f,hat:'fedora',band:0xc9a14a,eye:0xffb547}}],
  e1:[{n:'Lady Chance',  s:'Wears your luck as a necklace.',hp:26, bag:['pebble','pebble','loaded','loaded','d6','d6'], t:1, q:['steal','haze','hot'], look:{coat:0x1a0a20,hat:'cloche',hatc:0x6a1a5a,eye:0xff9ad0,scale:1.1}}],
  e2:[{n:'The Doubles',s:'Back for your wallet.',     hp:24, bag:['loaded','loaded','pebble','pebble','d6','glass'], t:1, q:['pair','steal'], look:{coat:0x1e3a36,hat:'bowler',eye:0x9ff5d3,scale:1.15}}],
  boss:{n:'The Countess', s:'Holds court upstairs', hp:42, bag:['loaded','loaded','loaded','pebble','d6','glass'], t:1, q:[], boss:true, sig:'gift', look:{coat:0x2a0a1a,hat:'cloche',hatc:0x12040c,eye:0xd8a8ff,scale:1.3,tie:0xc9a14a}}}},
 {name:'The Back Room', boss:'The House', short:'The House', bossD:'Nobody’s seen his face. Ties go to the house.', est:'NO EXIT',
  theme:{felt:'#466260',trim:'#a8a288',wall:'#2e302c',pat:'#3a3c36',style:'brick',lamp:0xd8ffe4,neon:'NO EXIT',neonC:'#ff2a2a',neonT:'#ffb0a0'},
  half:{add:['haze'],t:1,big:'The house always wins',small:'Haze, and he plays tight',note:'Every tie goes to him and costs you 2. At half nerve he adds Haze and plays tight.'},
  foes:{
  t1:[
    {n:'Specs',s:'Counts your breaths.',      hp:24, bag:['loaded','loaded','pebble','coin','d6','d6'], t:1, q:['edge','grudge'], look:{coat:0x2a2a2a,hat:'bowler',eye:0xfff1c0,mustache:true}},
    {n:'Miss Ruby',    s:'Collects debts.',            hp:25, bag:['pebble','pebble','loaded','coin','d6','d6'], t:1, q:['steal'], look:{coat:0x8a1020,hat:'cloche',eye:0xff5470}},
    {n:'Tony Twice',s:'Never says anything once.',  hp:26, bag:['loaded','loaded','loaded','coin','d6','d6'], t:1, q:['haze','hot'], look:{coat:0x1a1a1a,hat:'fedora',eye:0xff8a1a}}],
  t2:[
    {n:'Inky Lou',   s:'Writes your name down.',      hp:28, bag:['loaded','loaded','pebble','pebble','coin','d6'], t:1, q:['fuse','tax'], look:{coat:0x3a3428,hat:'cap',eye:0xffd27a}},
    {n:'The Widow',    s:'Third husband this year.',    hp:26, bag:['loaded','pebble','pebble','glass','coin','d6'], t:1, q:['cold','haze'], look:{coat:0x0a0a0a,hat:'cloche',hatc:0x050505,eye:0xffffff}},
    {n:'Bruno',        s:'Doesn’t play. Collects.',hp:30, bag:['loaded','loaded','loaded','pebble','coin','d6'], t:1, q:['edge','heavy'], look:{coat:0x2a1a10,hat:'cap',eye:0xff5470,scale:1.2}}],
  e1:[{n:'The Enforcer', s:'Cracks his knuckles between throws.',hp:34, bag:['loaded','loaded','loaded','pebble','shaved','coin'], t:1, q:['fuse','steal','heavy'], look:{coat:0x1a1410,hat:'cap',eye:0xff2a2a,scale:1.25}}],
  e2:[{n:'The Ledger',   s:'Nobody leaves owing.',        hp:38, bag:['loaded','loaded','loaded','pebble','pebble','shaved'], t:1, q:['edge','haze'], look:{coat:0x202024,hat:'bowler',eye:0xfff1c0,scale:1.15}}],
  boss:{n:'The House', s:'Always wins. Usually.', hp:56, bag:['shaved','shaved','coin','loaded','pebble','pebble'], t:1, q:['tax'], boss:true, sig:'house', look:{coat:0x101014,hat:'fedora',band:0xc9a14a,eye:0xffffff,scale:1.4,cigar:true,tie:0x7a1424}}}},
];
// ---- more faces at every table: extra regulars and sharks, and a second boss for each room ----
const MORE=[
 {t1:[{n:'Sleepy Joe',   s:'Nods off between throws.',      hp:9,  bag:['d6','d6','d6','d6','d6','d8'], t:2, q:['sloppy'], look:{coat:0x4a4038,hat:'cap',eye:0xffe0a0}}],
  t2:[{n:'Kitty', s:'Copies everything you do.',     hp:13, bag:['d6','d6','d6','d6','loaded','pebble'], t:2, q:['copycat'], look:{coat:0x8a4a20,hat:'cloche',eye:0xffb070}}],
  e2:[{n:'Lenny',s:'Never shuts up. Never.',      hp:21, bag:['loaded','loaded','pebble','d6','d6','d6'], t:2, q:['loud','hot'], look:{coat:0x6a5a1a,hat:'fedora',eye:0xffd27a}}],
  alt:{n:'Mama Rosa', s:'Feeds you, then bleeds you.', hp:40, bag:['loaded','loaded','loaded','pebble','d6','d6'], t:1, q:['tax'], boss:true, sig:'feed', short:'Rosa',
   d:'Runs the kitchen. Every round she wins, she heals what she took.', sigT:'Every round she wins, she heals what she hit you for.',
   half:{add:['hot'],t:1,big:'Second helpings',small:'Rosa adds Hot Streak'}, look:{coat:0x6a1a1a,hat:'none',eye:0xffb547,scale:1.25}}},
 {t1:[{n:'Dapper Dan',   s:'Tie straight. Odds straighter.',hp:17, bag:['loaded','d6','d6','d6','pebble','d6'], t:2, q:['sharp'], look:{coat:0x2a3a5a,hat:'top',eye:0x9fd3ff}}],
  t2:[{n:'Miss Fortune', s:'Reads your dice before they land.',hp:20, bag:['loaded','loaded','pebble','d6','d6','glass'], t:1, q:['copycat','haze'], look:{coat:0x3a1a4a,hat:'turban',eye:0xe0a0ff}}],
  e2:[{n:'The Magpie',   s:'Anything shiny.',               hp:26, bag:['loaded','loaded','pebble','pebble','d6','coin'], t:1, q:['steal','copycat'], look:{coat:0x101418,hat:'cloche',eye:0x9ff5d3}}],
  alt:{n:'Zambini', s:'Pulls your luck out of a hat.', hp:21, bag:['loaded','loaded','d6','pebble','d6','glass'], t:1, q:[], boss:true, sig:'trick', short:'Zambini',
   d:'A stage magician. One of your dice lands face-down every throw.', sigT:'One of your dice lands face-down every throw. Two at half nerve.',
   half:{add:['copycat'],t:1,big:'For my next trick',small:'Two dice hidden, and Copycat'}, look:{coat:0x1a0a2a,hat:'top',eye:0xc9a0ff,scale:1.25}}},
 {t1:[{n:'Officer Kelly',s:'On the take. On the clock.',    hp:25, bag:['loaded','loaded','pebble','coin','d6','d6'], t:1, q:['loud','tax'], look:{coat:0x1a2a4a,hat:'cap',eye:0x9fd3ff}}],
  t2:[{n:'Lucky Lucy',   s:'Has never lost a tie.',         hp:29, bag:['loaded','loaded','pebble','pebble','coin','d6'], t:1, q:['sharp','hot'], look:{coat:0x2a5a3a,hat:'cloche',eye:0xa0ffb0}}],
  e1:[{n:'Doc', s:'Sews up the losers. Charges extra.',hp:36, bag:['loaded','loaded','pebble','pebble','shaved','coin'], t:1, q:['sharp','grudge','haze'], look:{coat:0xd8d2c4,hat:'none',eye:0xffffff}}],
  alt:{n:'The Chief', s:'Owns the cops. Owns you.', hp:52, bag:['shaved','coin','loaded','loaded','pebble','pebble'], t:1, q:['loud'], boss:true, sig:'raid', short:'The Chief',
   d:'Every third round is a raid: your odds drop to 1.', sigT:'Every third round is a raid and your odds drop to 1. Every other round at half nerve.',
   half:{add:['sharp'],t:1,big:'Up against the wall',small:'Raids every other round, and Sharp'}, look:{coat:0x1a2236,hat:'cap',eye:0xffd27a,scale:1.35}}}];
// ---- a deeper bench: enough faces that no two runs meet the same people in the same order ----
const BENCH=[
 {t1:[{n:'Nickels', s:'Owes everybody five bucks.',     hp:9,  bag:['d6','d6','d6','d6','d6','pebble'], t:2, q:['tax'], look:{coat:0x4a3a2a,hat:'cap',eye:0xffd27a}},
      {n:'Granny Mae',    s:'Knits between throws.',          hp:10, bag:['d6','d6','d6','d6','d6','d6'], t:2, q:['sloppy'], look:{coat:0x5a4a6a,hat:'none',eye:0xfff1c0}}],
  t2:[{n:'Slim',      s:'All elbows.',                    hp:13, bag:['d6','d6','d6','d6','d6','loaded'], t:2, q:['fuse'], look:{coat:0x2a3a2a,hat:'fedora',eye:0x9ff5d3}},
      {n:'Hattie',s:'Hands like anchors.',            hp:14, bag:['loaded','pebble','d6','d6','d6','d6'], t:2, q:['heavy'], look:{coat:0x2a3a5a,hat:'headband',eye:0xffb070}}],
  e1:[{n:'The Kid',       s:'Too young to be in here.',       hp:14, bag:['pebble','d6','d6','d6','d6','d8'], t:2, q:['hot'], look:{coat:0x5a2a1a,hat:'cap',eye:0x9fd3ff,scale:1.05}}],
  e2:[{n:'Smiley', s:'Grins the whole time.',          hp:21, bag:['loaded','loaded','pebble','d6','d6','d6'], t:2, q:['sharp','tax'], look:{coat:0x3a2a4a,hat:'top',eye:0xffe070,scale:1.15}}]},
 {t1:[{n:'Fingers',s:'Counts cards. Wrong game.',      hp:16, bag:['loaded','pebble','d6','d6','d6','d6'], t:2, q:['steal'], look:{coat:0x3a3a3a,hat:'fedora',eye:0xc9f0ff}},
      {n:'Velma',         s:'Sings between rounds.',          hp:17, bag:['loaded','pebble','d6','d6','d6','d6'], t:2, q:['heavy'], look:{coat:0x7a1a3a,hat:'headband',eye:0xffa0d0}}],
  t2:[{n:'Rocco',         s:'Breaks thumbs on weekends.',     hp:21, bag:['loaded','loaded','pebble','d6','d6','d6'], t:1, q:['grudge','tax'], look:{coat:0x2a2420,hat:'fedora',eye:0xff8a5a}},
      {n:'Sister Grace',  s:'Prays for your dice.',           hp:21, bag:['loaded','loaded','pebble','d6','d6','coin'], t:2, q:['haze','edge'], look:{coat:0x18181e,hat:'veil',eye:0xf0f0ff}}],
  e1:[{n:'Iron Pete',  s:'Never blinks first.',            hp:26, bag:['loaded','loaded','pebble','d6','d6','d6'], t:1, q:['fuse','sharp'], look:{coat:0x3a2a1a,hat:'cap',eye:0xff5470,scale:1.15}}],
  e2:[{n:'Madame Noir',   s:'Plays with a stranger’s money.', hp:25, bag:['loaded','loaded','pebble','pebble','d6','glass'], t:1, q:['cold','tax'], look:{coat:0x0e0e14,hat:'veil',eye:0xc9a0ff,scale:1.1}}]},
 {t1:[{n:'Benny Blue',    s:'Plays the horn. Badly.',         hp:25, bag:['loaded','loaded','pebble','coin','d6','d6'], t:1, q:['cold','tax'], look:{coat:0x1a2a5a,hat:'fedora',eye:0x8fd3ff}},
      {n:'The Judge',  s:'Overrules your dice.',           hp:26, bag:['loaded','loaded','pebble','coin','d6','d6'], t:1, q:['sharp','nervous'], look:{coat:0x101010,hat:'none',eye:0xfff1c0}}],
  t2:[{n:'Lola',  s:'Wears her winnings.',            hp:29, bag:['loaded','loaded','pebble','pebble','coin','d6'], t:1, q:['steal','hot'], look:{coat:0xd8d2e4,hat:'headband',eye:0xa0e8ff}},
      {n:'Mack',   s:'Takes a cut of every pot.',      hp:30, bag:['loaded','loaded','pebble','pebble','d6','d6'], t:2, q:['copycat','tax'], look:{coat:0x2a1a1a,hat:'fedora',eye:0xff7a5a}}],
  e1:[{n:'The Undertaker',s:'Measures you for a box.',        hp:35, bag:['loaded','loaded','pebble','pebble','shaved','d6'], t:1, q:['grudge','heavy','cold'], look:{coat:0x0a0a0c,hat:'top',eye:0xb0ffb0,scale:1.2}}],
  e2:[{n:'Dolores',s:'Buys the table, then the room.',hp:37, bag:['shaved','loaded','loaded','pebble','pebble','coin'], t:1, q:['loud','steal'], look:{coat:0xe8e0f0,hat:'tiara',eye:0x9ff5ff,scale:1.2}}]}];
ACTS.forEach((A,i)=>['t1','t2','e1','e2'].forEach(k=>A.foes[k].push(...BENCH[i][k])));
// ---- the late crowd: more regulars and sharks with their own tricks, and a third owner for every room ----
const CROWD=[
 {t1:[{n:'Penny Pat',   s:'Tips in pennies. Still tips.',   hp:9,  bag:['d6','d6','d6','d6','d6','tin'], t:2, q:['generous'], look:{coat:0x5a6a3a,hat:'cloche',eye:0xffe0a0}},
      {n:'Wheezy',      s:'Coughs on the dice for luck.',   hp:10, bag:['d6','d6','d6','d6','d8','d8'], t:2, q:['soft'], look:{coat:0x4a4a52,hat:'bowler',eye:0xc0e0ff}}],
  t2:[{n:'Stretch',     s:'Leans over the whole table.',    hp:13, bag:['d6','d6','d6','d6','loaded','tin'], t:2, q:['short'], look:{coat:0x3a2a4a,hat:'top',eye:0xffd27a}},
      {n:'Clara Bell',  s:'Rings up every crown.',          hp:13, bag:['d6','d6','d6','loaded','pebble','d6'], t:2, q:['crowntax'], look:{coat:0x2a5a5a,hat:'headband',eye:0xa0ffe0}}],
  e1:[{n:'Mumbles',     s:'Nobody knows what he said.',     hp:15, bag:['d6','d6','d6','d6','loaded','pebble'], t:2, q:['stoneface'], look:{coat:0x3a3a2a,hat:'fedora',eye:0xffb070,scale:1.1}}],
  e2:[{n:'Brick',       s:'Built like the back wall.',      hp:22, bag:['loaded','loaded','tin','d6','d6','d6'], t:2, q:['thickhide'], look:{coat:0x6a2a1a,hat:'cap',eye:0xff8a5a,scale:1.25}}],
  boss:{n:'Fast Eddie', s:'Deals short. Talks shorter.', hp:38, bag:['loaded','loaded','tin','d6','d6','pebble'], t:2, q:['short','hot'], boss:true, sig:'short', short:'Eddie',
   d:'Runs the numbers out back. You draw one die fewer at his table.', sigT:'You draw one die fewer every round, and he has Hot Streak. At half nerve he adds Short Fuse.',
   half:{add:['fuse'],t:1,big:'Clock’s ticking',small:'Eddie adds Short Fuse and plays tight'}, look:{coat:0x1a3a4a,hat:'cap',eye:0x9ff5d3,scale:1.2}}},
 {t1:[{n:'Giggles',     s:'Laughs at her own rolls.',       hp:16, bag:['loaded','d6','d6','d6','tin','d6'], t:2, q:['soft','haze'], look:{coat:0x7a3a6a,hat:'headband',eye:0xffc0e0}},
      {n:'The Bishop',  s:'Blesses the pot, then takes it.',hp:17, bag:['loaded','ivory','d6','d6','d6','d6'], t:2, q:['crowntax'], look:{coat:0x2a1a4a,hat:'none',eye:0xfff1c0}}],
  t2:[{n:'Cricket',     s:'Never sits still.',              hp:20, bag:['loaded','loaded','tin','d6','d6','pebble'], t:1, q:['short','tax'], look:{coat:0x3a5a2a,hat:'cap',eye:0xd0ff90}},
      {n:'Olga',        s:'Arm-wrestles for the tab.',      hp:22, bag:['loaded','loaded','pebble','d6','d6','iron'], t:1, q:['thickhide'], look:{coat:0x5a2a2a,hat:'none',eye:0xffa070,scale:1.15}}],
  e1:[{n:'The Sphinx',  s:'Has one expression.',            hp:26, bag:['loaded','loaded','pebble','ivory','d6','d6'], t:1, q:['stoneface','edge'], look:{coat:0x6a5a2a,hat:'turban',eye:0xffe070,scale:1.1}}],
  e2:[{n:'Dice Mary',   s:'Brought her own. All of them.',  hp:25, bag:['ivory','ivory','loaded','pebble','coronet','d6'], t:1, q:['threes4','steal'], look:{coat:0x1a4a4a,hat:'cloche',eye:0x9fffe0,scale:1.1}}],
  boss:{n:'The Maestro', s:'Conducts the whole room.', hp:40, bag:['loaded','loaded','ivory','pebble','d6','glass'], t:1, q:['stoneface','lastword'], boss:true, sig:'maestro', short:'The Maestro',
   d:'Leads the house band. You never see his next move, and your last bank scores 1 more.', sigT:'You can’t see his next move, and your final bank each round scores 1 more. At half nerve he adds Odd Job.',
   half:{add:['threes4'],t:1,big:'Crescendo',small:'The Maestro adds Odd Job'}, look:{coat:0x0a0a0a,hat:'none',eye:0xffffff,scale:1.25,tie:0xffffff}}},
 {t1:[{n:'Two-Bit',     s:'Charges for the chair.',         hp:25, bag:['loaded','loaded','tin','coin','d6','d6'], t:1, q:['crowntax','tax'], look:{coat:0x4a4a2a,hat:'bowler',eye:0xffe070}},
      {n:'Sarge',       s:'Runs the table like a drill.',   hp:26, bag:['loaded','loaded','iron','coin','d6','d6'], t:1, q:['short'], look:{coat:0x3a4a2a,hat:'cap',eye:0xd0ffb0}}],
  t2:[{n:'Mother Superior',s:'Raps your knuckles.',         hp:29, bag:['loaded','loaded','ivory','pebble','coin','d6'], t:1, q:['threes4','sharp'], look:{coat:0x101014,hat:'veil',eye:0xffffff}},
      {n:'Old Ironsides',s:'Hasn’t felt a thing since ’19.',hp:31, bag:['loaded','loaded','iron','pebble','coin','d6'], t:1, q:['thickhide','grudge'], look:{coat:0x3a3a40,hat:'cap',eye:0xb0c0ff,scale:1.2}}],
  e1:[{n:'The Auditor', s:'Counts every crown twice.',      hp:35, bag:['loaded','loaded','ivory','pebble','shaved','coin'], t:1, q:['crowntax','loud','stoneface'], look:{coat:0x2a2a30,hat:'bowler',eye:0xc0ffd0,scale:1.15}}],
  e2:[{n:'Big Tiny',    s:'The door is behind him.',        hp:38, bag:['loaded','loaded','ivory','ivory','shaved','pebble'], t:1, q:['lid','thickhide'], look:{coat:0x1a1a1a,hat:'none',eye:0xff5a5a,scale:1.35}}],
  boss:{n:'The Banker', s:'Holds the note on everything.', hp:54, bag:['shaved','ivory','coin','loaded','pebble','pebble'], t:1, q:['crowntax','thickhide'], boss:true, sig:'banker', short:'The Banker',
   d:'Owns the paper on the whole block. Crowns cost you, and small wins barely count.', sigT:'Every crown costs you $1, and rounds you win by 2 or less hit half as hard. At half nerve he adds Loudmouth.',
   half:{add:['loud'],t:1,big:'Calling it in',small:'The Banker adds Loudmouth'}, look:{coat:0x1a2a1a,hat:'top',eye:0xb0ffb0,scale:1.3,tie:0xc9a14a}}}];
ACTS.forEach((A,i)=>['t1','t2','e1','e2'].forEach(k=>A.foes[k].push(...CROWD[i][k])));
const SIG0=['Once she’s at half nerve, she slams the table on your first throw each round: your two best dice get rerolled.','Swaps one of your dice for an Octo every round (two at half nerve).','Every tie goes to the opponent and hits you for 2.'];
ACTS.forEach((A,i)=>{ const f=A.foes, b=f.boss; b.short=A.short; b.d=A.bossD; b.half=A.half; b.sigT=SIG0[i];
  ['t1','t2','e1','e2'].forEach(k=>{ if(MORE[i][k]) f[k].push(...MORE[i][k]); }); f.bosses=[b,MORE[i].alt,CROWD[i].boss]; });
function bossOf(act,i){ return ACTS[act].foes.bosses[i||0]; }
// ---- Limits: raise the limit, the house raises the stakes. Each one stacks on the last. ----
const LIMITS=[
 {n:'Penny Ante',   d:'House rules. Nothing extra.'},
 {n:'Nickel',       d:'Everyone you face has 10% more nerve.'},
 {n:'Dime',         d:'Bosses bring an extra quirk.'},
 {n:'Quarter',      d:'Everything at the bar costs $1 more.'},
 {n:'Half Dollar',  d:'You walk in with 5 less nerve.'},
 {n:'Silver Dollar',d:'The Act III owners hit 1 harder.'},
 {n:'Card Sharp',   d:'Sharks throw one die face-down. You only see it after your first bank.'},
 {n:'Lead Slug',    d:'One of your House Dice is a cursed Lead Die: 1 1 2 3 4 5, never a crown. It can’t be tossed.'},
 {n:'Gold Eagle',   d:'Sharks bring an extra quirk too. No breather on the stairs.'},
 {n:'Last Orders',  d:'The bar shelf holds one charm less, and restocks cost double.'},
 {n:'The Big Board',d:'Everyone has 12% more nerve. Tables pay $2 less.'},
 {n:'Double Down',  d:'Beat the last owner and the other one sits down right after, at three-quarter nerve. No breather.'}];
function limitMods(lv){ lv=lv||0; return {hp:lv>=10?1.12:lv>=1?1.1:1, extraQ:lv>=2, price:lv>=3?1:0, startHp:lv>=4?-5:0, odds:lv>=5?1:0, hideE:lv>=6, lead:lv>=7, extraQE:lv>=8, stairs:lv>=8?0:.5, rest:.4, lastOrders:lv>=9, pay:lv>=10?-2:0, double:lv>=11}; }
// old saves numbered the ladder 0-7; this maps an old limit to the same rung on the new 0-11 ladder
const LIMIT_V1=[0,1,2,3,4,5,8,10], LIMIT_V2=[0,1,2,3,4,7,5,6,8,9,10,11]; // v1 (8 rungs) and v2 (Lead Slug was 5) to today's ladder
// ---- Deeds: beat an owner and you can take the deed to one of their rackets. Each is strong and costs you something.
const DEEDS={
  still:{name:'The Still',desc:'+1 charm slot. Everything at the bar costs $2 more.'},
  racket:{name:'Protection Racket',desc:'You sit down at every table with 10 Guard. Tables pay $2 less.'},
  brass:{name:'Brass Plate',desc:'No round takes more than 12 nerve from you. −10 max nerve.'},
  pockets:{name:'Deep Pockets',desc:'You draw 7 dice a round. Rounds you lose hit you 2 harder.'},
  badrep:{name:'Bad Reputation',desc:'+3 odds for good. Everyone you face has 15% more nerve.'},
  blackbook:{name:'The Black Book',desc:'Your Plays multiply: each one you make gives ×1.5 odds instead of its + odds.'},
  numbers:{name:'The Numbers Game',desc:'You get ×1.5 odds, always. Tables pay $3 less.'},
  pawnshop:{name:'The Pawn Shop',desc:'Everything at the bar costs a quarter less. −8 max nerve.'},
  muscle:{name:'Hired Muscle',desc:'Rounds you win, you win by 2 more. Rounds you lose hit you 1 harder.'} };
const DEED_KEYS=Object.keys(DEEDS);
const hasDeed=(G,k)=>!!(G&&G.deeds&&G.deeds.includes(k));
function takeDeed(G,k){ (G.deeds=G.deeds||[]).push(k); if(k==='brass'||k==='pawnshop'){ G.maxHp-=k==='brass'?10:8; G.hp=Math.min(G.hp,G.maxHp); } if(k==='badrep') G.rep=(G.rep||0)+3; }
const handSize=G=>HAND+(hasDeed(G,'pockets')?1:0);
const EXTRA_Q=['cold','fuse','haze','steal','grudge','hot','copycat','sharp','loud','crowntax','threes4','stoneface'];
// ---- who you walk in as ----
const POCKETS=[
 {k:'regular',n:'The Regular',d:'Six House Dice, two Octos, $8. The usual.',need:0},
 {k:'hustler',n:'The Hustler',d:'$22 in your pocket, but only 45 nerve.',need:1},
 {k:'collector',n:'The Collector',d:'Two House Dice come Polished and Lucky. $4.',need:2},
 {k:'gambler',n:'The Gambler',d:'Two High Rollers instead of Octos, and a Bent Spoon.',need:3},
 {k:'bootlegger',n:'The Bootlegger',d:'Gin and Absinthe in your coat and $12, but only 45 nerve.',need:4},
 {k:'jeweler',n:'The Jeweler',d:'One House Die already has a ruby, but only $3 and rubies at the bar start at $10.',need:5},
 {k:'mechanic',n:'The Mechanic',d:'Lucky Felt already installed (+1 odds, always). No cash, no Octos.',need:6},
 {k:'heavy',  n:'The Heavy',  d:'55 nerve and Thick Skin, but only $2.',need:8},
 {k:'ghost',  n:'The Ghost',  d:'Back Booth already installed (6 charm slots), but only 40 nerve.',need:10},
 {k:'socialite',n:'The Socialite',d:'A Royal Die and a Coronet instead of Octos, and Crown Jewels. Only $3.',need:7},
 {k:'charmer',n:'The Snake Charmer',d:'Two Boxcars instead of Octos, and Snake Eyes. Only 42 nerve.',need:9},
 {k:'drifter',n:'The Drifter',d:'Only six dice (one Loaded), Short Stack, and $12.',need:12},
 {k:'glazier',n:'The Glazier',d:'Three Glass Dice instead of three House Dice, and Glassblower.',need:14},
 {k:'banker', n:'The Banker’s Nephew',d:'$30 and Bar Fly, but only 36 nerve.',need:16},
 {k:'showman',n:'The Showman',d:'Every Play starts at level 2, and you carry a Gin. Only 42 nerve.',need:18}];
POCKETS.sort((a,b)=>a.need-b.need);
function pocketStart(k){ const P={hp:50,gold:8,bag:['d6','d6','d6','d6','d6','d6','d8','d8'],charms:[],gild:8,ruby:0};
  if(k==='hustler'){ P.gold=22; P.hp=45; } if(k==='gambler'){ P.bag=['d6','d6','d6','d6','d6','d6','gamble','gamble']; P.charms=['spoon']; }
  if(k==='jeweler'){ P.gild=10; P.gold=3; P.ruby=1; } if(k==='heavy'){ P.hp=55; P.gold=2; P.charms=['thick']; }
  if(k==='collector'){ P.gold=4; P.fins=['polished','lucky']; }
  if(k==='bootlegger'){ P.hp=45; P.gold=12; P.drinks=['gin','absinthe']; }
  if(k==='mechanic'){ P.gold=0; P.bag=['d6','d6','d6','d6','d6','d6','d6','d6']; P.fix=['felt']; }
  if(k==='ghost'){ P.hp=40; P.fix=['booth']; }
  if(k==='socialite'){ P.gold=3; P.bag=['d6','d6','d6','d6','d6','d6','royal','coronet']; P.charms=['jewels']; }
  if(k==='charmer'){ P.hp=42; P.bag=['d6','d6','d6','d6','d6','d6','boxcar','boxcar']; P.charms=['snake']; }
  if(k==='drifter'){ P.gold=12; P.bag=['d6','d6','d6','d6','d6','loaded']; P.charms=['stack']; }
  if(k==='glazier'){ P.bag=['d6','d6','d6','glass','glass','glass','d8','d8']; P.charms=['glassblower']; }
  if(k==='banker'){ P.gold=30; P.hp=36; P.charms=['barfly']; }
  if(k==='showman'){ P.hp=42; P.drinks=['gin']; P.plays=Object.fromEntries(PLAY_KEYS.map(p=>[p,1])); }
  return P; }
// what they're really sitting on, after charms and quirks that move it
function theirScore(oRaw,R,charms,q,rack){ if(q.includes('lid')) oRaw=Math.min(8,oRaw); let o=oRaw+nOf(charms,'bouncer',rack)-(q.includes('edge')?1:0)+(q.includes('sloppy')?1:0);
  o+=nOf(charms,'heckler',rack)*Math.min(1,R.crowns); if(q.includes('copycat')&&R.crowns) o-=1; return Math.max(0,o); }
// ---- The Mimic copies the charm to its right in your rack (rack order = left to right on screen). Odds charms are
// copied as a second odds part ('The Mimic' in the payout); every other effect counts the copied charm twice via nOf.
function mimicOf(charms,rack){ if(!charms||!charms.includes('mimic')) return null; const rk=rack||charms, r=rk[rk.indexOf('mimic')+1]; return r&&r!=='mimic'&&charms.includes(r)?r:null; }
// your rack as it looks on screen, left to right: charms in their slots, empty slots as null, then off-book charms
function rackOf(G){ const on=G.charms.filter(c=>!offbook(G,c)), off=G.charms.filter(c=>offbook(G,c)); while(on.length<charmSlots(G)) on.push(null); return on.concat(off); }
const MIMIC_FLAT=['jacks','penny','deuces','ringer','rabbitp','sleight','nearmiss','barback','fence','practice','mimic'];  // copying these changes nothing
const nOf=(charms,k,rack)=>(charms&&charms.includes(k)?1:0)+(mimicOf(charms,rack)===k?1:0);
// their final number to beat: their dice plus everything that moves it (charms, quirks, drinks, intents)
function targetOf(oRaw,R,charms,q,env){ return Math.max(0,theirScore(oRaw,R,charms,q,env&&env.rack)+(env&&env.drink&&env.drink.soda?2*env.drink.soda:0)+(env&&env.intent==='tired'?2:0)); }
// Guard soaks hits and carries from round to round at a table; it only loses what it soaks
function soak(guard,dmg){ const s=Math.min(guard||0,dmg); return {dmg:dmg-s,guard:(guard||0)-s,soaked:s}; }
// overkill: every 10 past what they had left pays $1, up to $10
const overkillPay=(dmg,hpLeft)=>Math.min(10,Math.floor(Math.max(0,dmg-hpLeft)/10));
const breaksAt=(type,charms,rack)=>DT[type].breaks?DT[type].breaks+2*nOf(charms,'glassblower',rack):0;
const bombDmg=max=>Math.max(2,Math.round(max*.08));
const isRaid=(opp,round,p2)=>opp.sig==='raid'&&round>0&&round%(p2?2:3)===0;
// floor pools: F table, E shark, S bar, R back alley, ? event, B boss
const FLOORS=[['F'],['F','?'],['F','E','?'],['R','?'],['F','E','?'],['F','E'],['F','?','E'],['R','?'],['B']];
const HAND=6;
// ---- scaling: each act is a new tier, like a new ante. HP grows geometrically, their odds climb. ----
// nerve at the top of each act for a regular / shark / boss. Regulars and sharks ramp up floor by floor.
// sharks and bosses carry a random counter (rulesFor), so they run lighter on nerve than they used to
const ACT_HP=[{F:21,E:38,B:44},{F:186,E:196,B:214},{F:1090,E:1020,B:1210}];
const ACT_ODDS=[1,2,2];           // how hard their wins hit you
const ENDLESS_GROW=2;              // endless: every room past Act III doubles nerve (and adds +1 to their odds)
function rnd(n){return Math.floor(Math.random()*n)}
function pick(a){return a[rnd(a.length)]}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function facesOf(d){ return (d&&d.f)||DT[typeof d==='string'?d:d.type].faces; }
function rollFace(type){return pick(DT[type].faces)}
function rollInst(d){ return pick(facesOf(d)); }
function finVal(v,fin){ return fin==='feather'&&v===1?0:fin==='weighted'&&v>=5?v-1:v; }
function effVal(face,ctx){ if(face==='C'||face==='G') return ctx&&ctx.crownless?1:ctx&&ctx.cold?1:ctx&&ctx.ringer?-1:0; if(face===1&&ctx&&ctx.ringer) return 3; if(face===1&&ctx&&ctx.snakebit) return 2; if(face===1&&ctx&&ctx.penny) return 0; if(face===2&&ctx&&ctx.deuces) return 1; if(face===3&&ctx&&ctx.odd) return 4; return face; }
function aiKeep(faces,t){ const e=faces.map(f=>effVal(f)); let k=e.map((v,i)=>v<=t?i:-1).filter(i=>i>=0); if(!k.length){let m=0;e.forEach((v,i)=>{if(v<e[m])m=i});k=[m]} return k; }
function aiRound(bag,t){ let left=bag.map((_,i)=>i), throws=[], total=0;
  while(left.length){ const faces=left.map(i=>rollFace(bag[i])); const kl=aiKeep(faces,t); const kept=kl.map(k=>left[k]); kl.forEach(k=>total+=effVal(faces[k])); throws.push({left:left.slice(),faces,kept}); left=left.filter(i=>!kept.includes(i)); }
  return {throws,total}; }
function tierRef(act,kind){ const f=ACTS[act].foes, L=kind==='E'?[...f.e1,...f.e2]:kind==='B'?[f.boss]:[...f.t1,...f.t2]; return L.reduce((a,d)=>a+d.hp,0)/L.length; }
function oppHP(def,kind,act,floor,lap,easy){ const w=def.hp/tierRef(act,kind), base=lap?ACT_HP[2][kind]*Math.pow(ENDLESS_GROW,3*lap+act-2):ACT_HP[act][kind];
  return Math.max(4,Math.round(base*w*(kind==='B'?1:1+.08*floor)*(easy?.72:1))); }
function makeOpp(def,kind,act,floor,lap,easy,lv,hpMul){ let bag=def.bag.slice(); for(let k=0;k<lap;k++){const i=bag.findIndex(b=>b==='d6'||b==='d8'); if(i>=0) bag[i]=k%2?'pebble':'loaded';}
  const LM=limitMods(lv), q=(def.q||[]).slice(); if((LM.extraQ&&kind==='B')||(LM.extraQE&&kind==='E')){ const ex=EXTRA_Q.filter(x=>!q.includes(x)); if(ex.length) q.push(pick(ex)); }
  q.push(...rulesFor(kind,act,lap||0,q));
  return {...def, hp:Math.round(oppHP(def,kind,act,floor,lap,easy)*LM.hp*(hpMul||1)), odds:(lap?ACT_ODDS[2]+3*lap+act-2:ACT_ODDS[act])+(kind==='B'&&q.indexOf('ironjaw')<0?1:0)+(kind==='E'?1:0)+(kind==='F'&&floor>=3?1:0)+((act>=2||lap)&&kind==='B'?LM.odds:0), bag, q}; }
// ---- a round's running record; everything that pays is computed from this ----
function newRound(){ return {cash:0,heal:0,guard:0,twos:0,hi:0,sixes:0,low0:0,odd:0,solo:0,first1:0,house:0,oct:0,kinds:{},crowns:0,gilt:0,ember:0,roller:0,ones:0,threes:0,glass:0,gold:0,bomb:0,snake:false,singles:true,throws:0,evens:0,trips:false,lastBank:0,bubbly:0,viper:0,cnt:{}}; }
function bankVals(faces,ctx,charms,final,fins,rack){ let v=faces.map((f,i)=>finVal(effVal(f,ctx),fins&&fins[i]));
  if(charms.includes('jacks')){ const s=new Set(); v=faces.map((f,i)=>{ if(s.has(f)) return 0; s.add(f); return v[i]; }); }
  if(final) for(let n=nOf(charms,'lastcall',rack);n>0;n--){ let m=0; v.forEach((x,i)=>{ if(x>v[m]) m=i; }); if(v[m]>=4) v[m]-=1; }
  if(final&&ctx&&ctx.lastword&&v.length) v[0]+=1;
  return v; }
function noteBank(R,faces,types,charms,fins,rack){ if(fins&&fins.includes('marked')){ const f2=[],t2=[],n2=[]; faces.forEach((f,i)=>{ f2.push(f); t2.push(types[i]); n2.push(fins[i]==='marked'?null:fins[i]); if(fins[i]==='marked'){ f2.push(f); t2.push(types[i]); n2.push(null); } }); R.marked=(R.marked||0)+fins.filter(x=>x==='marked').length; faces=f2; types=t2; fins=n2; }
  R.throws++; if(faces.length!==1) R.singles=false;
  (fins||[]).forEach(f=>{ if(!f) return; R.fin={...(R.fin||{})}; R.fin[f]=(R.fin[f]||0)+1; });
  const ch=charms||[], nE=nOf(ch,'echo',rack), nD=nOf(ch,'doubletake',rack);
  faces.forEach((f,i)=>{ if(f==='G'||f==='C'){ if(nE&&R.throws===1) R.crowns+=nE; if(fins&&fins[i]==='inked') R.crowns++; } if(f==='G'){ R.crowns++; R.gilt++; } if(f==='C'){ R.crowns++; if(types[i]==='ember') R.ember++; if(types[i]==='gamble') R.roller++; } });
  { const n1=faces.filter(f=>f===1).length*(1+nD); R.ones+=n1; if(n1>=2) R.snake=true; }
  R.threes+=faces.filter(f=>f===3).length; R.glass+=types.filter(t=>t==='glass').length;
  faces.forEach((f,i)=>{ if(f==='C'&&types[i]==='gilded') R.gold++; if(f==='C'&&types[i]==='bomb') R.bomb++; });
  R.cnt={...(R.cnt||{})}; const here={}; faces.forEach((f,i)=>{ R.cnt[f]=(R.cnt[f]||0)+1; here[f]=(here[f]||0)+1;
    if(f===2||f===4||f===6) R.evens=(R.evens||0)+1; if(f==='C'&&types[i]==='bubbly') R.bubbly=(R.bubbly||0)+1; if(f===1&&types[i]==='viper') R.viper=(R.viper||0)+1; if(f===1&&types[i]==='payday') R.payday=(R.payday||0)+1; });
  if(Object.values(here).some(n=>n>=3)) R.trips=true; R.lastBank=faces.length;
  // the second case of dice, and the counters the newer charms read
  R.kinds={...(R.kinds||{})}; R.moon=0; if(faces.length===1) R.solo=(R.solo||0)+1; if(faces.length>=4) R.big=true; if(faces.filter(f=>f==='C'||f==='G').length>=2) R.crown2=true;
  faces.forEach((f,i)=>{ const t=types[i], num=typeof f==='number', crown=f==='C'||f==='G'; R.kinds[t]=1;
    if(f===2) R.twos=(R.twos||0)+1; if(num&&f>=5) R.hi=(R.hi||0)+1; if(num&&f>=6) R.sixes=(R.sixes||0)+1; if(num&&f<=0) R.low0=(R.low0||0)+1; if(f===1||f===3||f===5) R.odd=(R.odd||0)+1;
    if(f===1&&R.throws===1) R.first1=(R.first1||0)+1+nD; if(t==='d6') R.house=(R.house||0)+1; if(DT[t]&&DT[t].faces.length===8) R.oct=(R.oct||0)+1;
    if(t==='rust') R.cash=(R.cash||0)+1; if(t==='slot'&&crown) R.cash=(R.cash||0)+5; if(t==='saint'&&crown) R.heal=(R.heal||0)+3; if(t==='iron') R.guard=(R.guard||0)+2;
    if(t==='mercury'&&R.throws===1) R.quick=(R.quick||0)+1; if(t==='jade'&&f===3) R.jade=(R.jade||0)+1; if(t==='anvil'&&num&&f>=4) R.anvil=(R.anvil||0)+1;
    if(t==='magnet'&&here[f]>=2) R.magnet=(R.magnet||0)+1; if(t==='moon') R.moon++; if(t==='dynamite'&&f==='C') R.bomb=(R.bomb||0)+2;
    const fn=fins&&fins[i]; if(fn==='sterling') R.guard=(R.guard||0)+1; if(fn==='blessed') R.heal=(R.heal||0)+1; }); }
// After every round: growing charms and round money. Returns $ to pay out. (game endRound and the sim both call this)
function afterRound(G,winner,free){ const has=c=>G.charms.includes(c); G.grow=G.grow||{}; let pay=0;
  if(winner==='you'){ const db=nOf(G.charms,'deepbreath',rackOf(G)); if(db&&G.hp>0) G.hp=Math.min(G.maxHp,G.hp+2*db); if(has('piggy')) G.grow.piggy=(G.grow.piggy||0)+2; if(has('moonshine')) G.grow.moon=(G.grow.moon||0)+1; }
  if(winner==='them'&&!free){ if(has('piggy')) G.grow.piggy=0; pay+=2*nOf(G.charms,'consolation',rackOf(G)); }
  return pay; }
// ---- Fixtures: permanent upgrades. One is on offer at the bar each room until you buy it.
const FIXTURES={
  booth:   {name:'Back Booth',      price:14, desc:'You can hold 6 charms instead of 5.'},
  discount:{name:'Regular’s Discount',price:10, desc:'Everything at the bar costs 20% less.'},
  shelf:   {name:'Second Shelf',    price:10, desc:'The bar stocks 4 charms instead of 3.'},
  restock: {name:'Standing Order',  price:8,  desc:'Your first restock at every bar is free, and each costs $1 less.'},
  crates:  {name:'Bigger Crates',   price:8,  desc:'Crates hold 4 picks instead of 3.'},
  felt:    {name:'Lucky Felt',      price:15, desc:'You get +1 odds, always.'},
  taste:   {name:'Expensive Taste', price:10, desc:'Rare charms and dice turn up twice as often.'},
  ledger:  {name:'Cooked Books',    price:10, desc:'Off the Books charms turn up three times as often.'},
  rope:    {name:'Velvet Rope',     price:12, desc:'+8 max nerve, and you heal 8 now.'},
  icebox:  {name:'Ice Box',         price:9,  desc:'Your coat holds one more drink.'},
  backdoor:{name:'Back Door',       price:8,  desc:'Tossing a die costs $3 less.'},
  jukebox: {name:'Jukebox',         price:10, desc:'You sit down at every table with 5 Guard.'},
  chandelier:{name:'Chandelier',    price:10, desc:'Tables pay $1 more.'},
  vault:   {name:'Wall Safe',       price:9,  desc:'Win a fight: you get $1 per $10 you’re holding (up to $5). Stacks with Savings Bond.'},
};
const FIX_KEYS=Object.keys(FIXTURES);
function fixOffer(G){ const own=G.fix||[], un=FIX_KEYS.filter(k=>!own.includes(k)); G.fixRoom=G.fixRoom||{}; const key=G.act+'/'+(G.lap||0);
  if(!G.fixRoom[key]||own.includes(G.fixRoom[key])) G.fixRoom[key]=un.length?pick(un):null; return G.fixRoom[key]; }
function hasFix(G,k){ return !!(G.fix&&G.fix.includes(k)); }
function charmSlots(G){ return MAX_CHARMS+(hasFix(G,'booth')?1:0)+(hasDeed(G,'still')?1:0); }
function barPrice(G,p){ p+=hasDeed(G,'still')?2:0; if(hasDeed(G,'pawnshop')) p=Math.max(1,Math.round(p*.75)); return hasFix(G,'discount')?Math.max(1,Math.round(p*.8)):p; }
function restockPrice(G){ const n=G.restocks||0; if(hasFix(G,'restock')&&n===0) return 0; return Math.max(1,3+n-(hasFix(G,'restock')?1:0))*(limitMods(G.limit).lastOrders?2:1); }
// ---- Drinks: single-use, carried in your coat (2 at most). Drink one on your turn; it lasts the round.
const DRINKS={
  gin:     {name:'Gin',        price:4, desc:'+3 odds this round.'},
  absinthe:{name:'Absinthe',   price:6, desc:'×2 odds this round.'},
  soda:    {name:'Soda Water', price:4, desc:'The opponent’s score counts 2 higher this round.'},
  bitters: {name:'Bitters',    price:4, desc:'If you lose this round, their odds count as 1.'},
  bourbon: {name:'Bourbon',    price:4, desc:'Heal 10 nerve.'},
  sidecar: {name:'Sidecar',    price:3, desc:'$6, right now.'},
  rye:     {name:'Rye',        price:4, desc:'+6 Guard, right now.'},
  mimosa:  {name:'Mimosa',     price:4, desc:'+2 odds per crown you bank this round.'},
  oldf:    {name:'Old Fashioned',price:5, desc:'If you win this round, you win it by 3 more.'},
  martini: {name:'Dirty Martini',price:6, desc:'×3 odds this round. You lose 4 nerve (never your last).'},
};
const DRINK_KEYS=Object.keys(DRINKS), DRINK_MAX=2;
// how many drinks your coat holds, what a charm sells for, where you start at a table, what a table pays on top
const drinkMax=G=>DRINK_MAX+(hasFix(G,'icebox')?1:0)+(G.charms&&G.charms.includes('barback')?1:0);
const sellValue=(G,c)=>G.charms&&G.charms.includes('fence')?CHARMS[c].price:Math.floor(CHARMS[c].price/2);
const startGuard=G=>6*nOf(G.charms,'flask',rackOf(G))+4*nOf(G.charms,'haymaker',rackOf(G))+(hasDeed(G,'racket')?10:0)+(hasFix(G,'jukebox')?5:0);
const payMod=G=>-(hasDeed(G,'racket')?2:0)-(hasDeed(G,'numbers')?3:0)+(hasFix(G,'chandelier')?1:0);
const playEvery=G=>G&&G.charms&&G.charms.includes('practice')?3:PLAY_EVERY;
// ---- Plays: patterns you bank in a round. Every Play starts at level 1 and levels up every 4th time you make it.
const PLAYS={ pair:{name:'Pair of Ones',desc:'Bank two 1s in one go.',per:1},
  trips:{name:'Three of a Kind',desc:'Bank three of the same face in one go.',per:2},
  ladder:{name:'The Ladder',desc:'Bank a 1, a 2 and a 3 in the same round.',per:2},
  court:{name:'Crown Court',desc:'Bank 3 or more crowns in a round.',per:3},
  clean:{name:'Clean Hands',desc:'Finish a round on 3 or less.',per:2},
  bighand:{name:'Big Hand',desc:'Bank 4 or more dice in one go.',per:2},
  quick:{name:'Two and Through',desc:'Finish a round in 2 throws or fewer.',per:2},
  society:{name:'High Society',desc:'Bank 2 or more crowns in one go.',per:2} };
const PLAY_KEYS=Object.keys(PLAYS);
const playLv=(plays,k)=>((plays||{})[k]||0)+1;
// Plays also widen your win: +1 to your margin per level of every Play you made this round
function playsPot(R,env){ if(!env||!env.plays) return 0; return playsHit(R,env).reduce((a,k)=>a+playLv(env.plays,k),0); }
// a Play levels up every 4th time you make it (your reputation for it grows). Returns the Plays that just levelled.
const PLAY_EVERY=4;
function notePlays(G,R,env){ G.playHits=G.playHits||{}; G.plays=G.plays||{}; const up=[]; const ev=playEvery(G); playsHit(R,env).forEach(k=>{ G.playHits[k]=(G.playHits[k]||0)+1; if(G.playHits[k]%ev===0){ G.plays[k]=(G.plays[k]||0)+1; up.push(k); } }); return up; }
function playsHit(R,env){ const c=R.cnt||{}, out=[]; if(R.snake) out.push('pair'); if(R.trips) out.push('trips'); if(c[1]&&c[2]&&c[3]) out.push('ladder'); if((R.crowns||0)>=3) out.push('court'); if(env&&env.done&&env.score!=null&&env.score<=3) out.push('clean'); if(R.big) out.push('bighand'); if(env&&env.done&&R.throws>0&&R.throws<=2) out.push('quick'); if(R.crown2) out.push('society'); return out; }
// ---- Intents: what the opponent is up to this round. Shown a round ahead.
// what they're up to each round. short = the plain line on their nameplate; you = good (1) or bad (-1) for you
const INTENTS={ steady:{name:'Steady',desc:'Nothing special.',short:'Playing it straight.',you:0},
  lean:{name:'Leaning in',desc:'Their Hits +1 this round.',short:'If they win, they hit you 1 harder.',you:-1},
  sweat:{name:'Sweating',desc:'Their Hits are halved this round (rounded up).',short:'If they win, their hit is halved.',you:1},
  crowns:{name:'Counting crowns',desc:'Your crowns score 1 on your first throw this round.',short:'Your crowns score 1 on your first throw.',you:-1},
  tired:{name:'Getting tired',desc:'Their score counts 2 higher this round.',short:'Their score counts 2 higher.',you:1},
  tilted:{name:'On tilt',desc:'Win this round and you get ×2 odds.',short:'Win the round: you get ×2 odds.',you:1} };
const INTENT_W={F:{steady:4,tired:2,sweat:2,tilted:2,lean:1,crowns:1},E:{steady:3,lean:2,tilted:2,crowns:1,sweat:1,tired:1},B:{steady:2,lean:3,crowns:1,sweat:1,tilted:1,tired:1}};
function rollIntent(kind){ const w=INTENT_W[kind]||INTENT_W.F; let t=Math.random()*Object.values(w).reduce((a,b)=>a+b,0); for(const k in w){ t-=w[k]; if(t<0) return k; } return 'steady'; }
const intentT=(opp,intent)=>opp.t;
function theirOdds(opp,env){ const q=opp.q||[]; let o=(env&&env.drink&&env.drink.bitters)?1:opp.odds+(q.includes('bloodlust')?Math.floor(Math.max(0,((env&&env.round)||1)-1)/2):0);
  const it=env&&env.intent; if(it==='lean') o+=1; if(it==='sweat') o=Math.ceil(o/2); return o; }
// Bump the Table: their lowest banked die gets thrown again. Returns which die and how their total moves.
function bumpLowest(sim,bag){ let best=null; sim.throws.forEach(th=>th.kept.forEach(i=>{ const f=th.faces[th.left.indexOf(i)], v=effVal(f); if(!best||v<best.v) best={i,f,v}; })); if(!best) return null; const nf=rollFace(bag[best.i]); return {i:best.i,old:best.f,face:nf,delta:effVal(nf)-best.v}; }
// ---- Bosses always reach their second half: no single round takes them past the halfway mark.
function gateDmg(opp,hp,max,phase2,dmg){ if(!opp.boss||phase2) return dmg; const half=Math.floor(max/2); return hp>half&&hp-dmg<half?hp-half:dmg; }
// ---- Toss a die: starts at $6 and costs $3 more each time this run.
const tossPrice=G=>Math.max(2,6+3*(G.tossed||0)-(hasFix(G,'backdoor')?3:0)-(G.charms&&G.charms.includes('fence')?3:0));
// ---- Chits: earned by beating a shark in 2 rounds or less, or by walking past a table. Spent on their own when they apply.
const CHITS={
  cash:   {name:'Cash Chit',     desc:'$5, right now.'},
  comp:   {name:'Comp',          desc:'The next charm you buy at the bar is free.'},
  crate:  {name:'Free Crate',    desc:'The next bar has a free Charm Crate on the counter.'},
  rare:   {name:'Tip-off',       desc:'The next bar has a rare charm on the shelf.'},
  offbook:{name:'Under the Table',desc:'The next bar’s first charm is Off the Books.'},
  finish: {name:'Polish Job',    desc:'A random die in your bag gets a random finish, right now.'},
  double: {name:'Double or Nothing',desc:'Your next table pays double.'},
  stiff:  {name:'Stiff Drink',   desc:'Heal 10 nerve, right now.'},
};
const CHIT_KEYS=Object.keys(CHITS);
const QUICK_WIN=2; // beat a shark in this many rounds or fewer: earn a chit (walking past a table earns one too)
// ---- Crates: buy at the bar, open, keep one
const CRATES={
  charm:{name:'Charm Crate', price:6, desc:'Pick 1 of 3 charms.'},
  dice: {name:'Dice Crate',  price:5, desc:'Pick 1 of 3 dice. Some come finished.'},
  kit:  {name:'Finish Kit',  price:5, desc:'Pick 1 of 3 finishes, then the die that wears it.'},
};
function crateSize(G){ return hasFix(G,'crates')?4:3; }
// Jinx: which charm sits out this round (game and sim both call this at round start)
function jinxPick(charms,q){ return q.includes('jinx')&&charms.length?pick(charms):null; }
function regenOf(opp){ return opp.q.includes('regen')?Math.max(1,Math.ceil(opp.hp*.03)):0; }
// After a fight you win: interest. Returns $.
function afterFight(G){ const i=Math.min(5,Math.floor(Math.max(0,G.gold)/10)); return nOf(G.charms,'savings',rackOf(G))*i+(hasFix(G,'vault')?i:0); }
// env: {gold, wins (rounds won in a row before this one), margin, score, done}
function oddsOf(R,charms,env){ const P=[]; let add=0, mul=1; const has=c=>charms.includes(c);
  const A=(l,n)=>{ if(n){ add+=n; P.push([l,(n<0?'\u2212':'+')+Math.abs(n),n]); } }, M=(l,x)=>{ if(x!==1){ mul*=x; P.push([l,'×'+(+x.toFixed(x<2?2:1)),x]); } };
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
  if(has('blood')) A('Blood Money',6);
  if(has('threes')) A('Three\u2019s Company',2*R.threes);
  if(has('glassblower')) A('Glassblower',2*R.glass);
  if(has('regular')) A('The Regular',Math.max(0,(env.round||1)-1));
  const grow=env.grow||{}, cnt=R.cnt||{};
  if(has('collection')) A('The Collection',4*charms.length);
  if(has('evens')) A('Even Money',2*(R.evens||0));
  if(has('piggy')) A('Piggy Bank',grow.piggy||0);
  if(has('tommy')&&env.done) A('Tommy Gun',2*(R.lastBank||0));
  if(has('shiner')&&env.done&&!R.crowns) A('Shiner',6);
  const fin=R.fin||{}, shine=has('shoeshine')?2:0, punch=has('rabbitp')?2:0;
  if(fin.polished) A('Polished',(2+shine)*fin.polished);
  if(fin.lucky) A('Lucky',(4+shine+punch)*fin.lucky);
  if(shine&&fin.chrome) A('Shoeshine',shine*fin.chrome); if(shine&&fin.goldleaf) A('Shoeshine',shine*fin.goldleaf);
  if(has('curator')) A('The Curator',2*(env.finished||0));
  if(has('restless')) A('Restless',2*(grow.restock||0));
  if(has('craterat')) A('Crate Rat',3*(grow.crates||0));
  if(has('stub')) A('Ticket Stub',2*(grow.chits||0));
  if(R.quick) A('Quicksilver',3*R.quick); if(R.jade) A('Jade Die',3*R.jade); if(R.magnet) A('Magnet',4*R.magnet);
  if(has('twostep')) A('Two-Step',2*(R.twos||0));
  if(has('oddball')) A('Odd Man Out',2*(R.odd||0));
  if(has('aces')) A('Aces Up',2*(R.first1||0));
  if(has('bigbank')&&R.big) A('Heavy Pour',5);
  if(has('eightball')) A('Eight Ball',3*(R.oct||0));
  if(has('purist')) A('House Rules',2*(R.house||0));
  if(has('bully')&&env.kind==='F') A('The Bully',5);
  if(has('firstblood')&&env.oppFull) A('First Blood',6);
  if(has('fullstomach')&&env.maxHp&&env.hp>=env.maxHp) A('Full Stomach',5);
  if(has('welldrinks')) A('Well Drinks',2*charms.filter(c=>CHARMS[c]&&CHARMS[c].tier==='c').length);
  if(has('lonewolf')) A('Lone Wolf',2*(R.solo||0));
  if(has('marathon')) A('Long Night',R.throws||0);
  if(has('quickdraw')&&env.done&&R.throws>0&&R.throws<=2) A('Quick Draw',6);
  if(has('rainbow')) A('Mixed Drinks',2*Object.keys(R.kinds||{}).length);
  if(has('highroad')) A('The High Road',3*(R.hi||0));
  if(has('zero')) A('Nothing Doing',4*(R.low0||0));
  if(has('coronation')&&R.crown2) A('Coronation',6);
  if(has('evensteven')&&env.done&&R.throws>0&&env.score%2===0) A('Even Steven',4);
  if(has('broke')&&(env.gold||0)<=5) A('Empty Pockets',8);
  if(has('brickwall')) A('Brick Wall',Math.floor((env.guard||0)/2));
  if(has('happyhour')) A('Happy Hour',3*(env.coat||0));
  if(has('topshelf')) A('Top Shelf',3*charms.filter(c=>CHARMS[c]&&CHARMS[c].tier==='r').length);
  if(has('showman')&&env.plays) A('The Showman',3*playsHit(R,env).length);
  if(has('lonestar')) A('Lone Star',7*(env.free||0));
  if(env.fixOdds) A('Lucky Felt',env.fixOdds);
  const dk=env.drink||{}; if(dk.gin) A('Gin',3*dk.gin); if(dk.mimosa) A('Mimosa',2*dk.mimosa*R.crowns);
  if(env.plays) playsHit(R,env).forEach(k=>{ const lv=playLv(env.plays,k), nm=PLAYS[k].name+(lv>1?' Lv '+lv:''); if(env.deeds&&env.deeds.includes('blackbook')) M(nm,1.5); else A(nm,PLAYS[k].per*lv); });
  if(env.q&&env.q.includes('loud')){ add-=2; P.push(['Loudmouth','\u22122']); }
  if(R.roller) M('High Roller',Math.pow(2,R.roller));
  if(has('kingpin')&&R.crowns) M('Kingpin',Math.pow(1.35,R.crowns));
  if(has('closer')&&(env.margin||0)>=5) M('The Closer',2);
  if(has('lowball')&&env.done&&env.score<=3) M('Low Ball',3);
  if(has('opener')&&env.round===1) M('Opening Act',2);
  if(has('allin')&&env.done&&R.throws===1) M('All In',3);
  if(has('doubledown')&&(env.wins||0)>=1) M('Double Down',3);
  if(has('highstakes')) M('High Stakes',2);
  if(R.bubbly) M('Champagne',Math.pow(1.5,R.bubbly));
  if((R.fin||{}).chrome) M('Chrome',Math.pow(1.25,R.fin.chrome));
  if(dk.absinthe) M('Absinthe',Math.pow(2,dk.absinthe));
  if(R.viper) M('Viper',Math.pow(1.5,R.viper));
  if(has('jackpot')&&R.trips) M('Jackpot',2);
  if(has('longshot')&&env.margin>=1&&env.margin<=2) M('Long Shot',2.5);
  if(has('finisher')&&env.oppHalf) M('The Finisher',2.5);
  if(has('moonshine')&&grow.moon) M('Moonshine',1+.05*grow.moon);
  if(has('crownroom')&&R.crowns>=3) M('The Crown Room',3);
  if(has('straight')&&cnt[1]&&cnt[2]&&cnt[3]) M('Straight Shooter',5);
  if(has('bigshot')) M('Big Shot',Math.pow(1.2,charms.length));
  if(R.anvil) M('Anvil',Math.pow(1.5,R.anvil)); if(R.moon&&env.done) M('Moonstone',Math.pow(2,R.moon));
  if(dk.martini) M('Dirty Martini',Math.pow(3,dk.martini));
  if(env.deeds&&env.deeds.includes('numbers')) M('The Numbers Game',1.5);
  if(has('closingtime')&&(env.round||1)>=4) M('Closing Time',2);
  if(has('giantkiller')&&env.kind&&env.kind!=='F') M('Giant Killer',1.5);
  if(has('comeback')&&(env.lossStreak||0)>0) M('Comeback Kid',2.5);
  if(has('adrenaline')&&env.maxHp&&env.hp<=env.maxHp/2) M('Adrenaline',2);
  if(has('pokerface')&&(env.intent==='lean'||env.intent==='crowns')) M('Poker Face',2);
  if(has('nightcap')&&Object.values(dk).some(Boolean)) M('Nightcap',1.5);
  if(has('wheel')&&env.wheel) M('Wheel of Fortune',3);
  if(has('heavyweight')&&env.done&&env.score>=10&&(env.margin||0)>0) M('Heavyweight',3);
  if(has('sevens')&&env.done&&env.score===7) M('Sevens',4);
  if(has('sweep')&&env.done&&R.throws>0&&env.score<=0) M('Clean Sweep',4);
  if(has('snakepit')&&R.ones) M('Snake Pit',Math.pow(1.2,R.ones));
  if(has('sixgun')&&R.sixes) M('Six-Shooter',2);
  if(has('regicide')&&env.done&&R.throws>0&&!R.crowns) M('No Kings',2);
  if(has('midas')&&(env.gold||0)>=10) M('Midas',Math.min(2,1+.1*Math.floor(env.gold/10)));
  if(has('glassjaw')) M('Glass Jaw',2.5);
  if(has('travellight')&&(env.bag||8)<8) M('Travel Light',Math.pow(1.25,8-env.bag));
  if(env.intent==='tilted') M('On tilt',2);
  { const rt=mimicOf(charms,env.rack); if(rt&&CHARMS[rt]){ const pt=P.find(x=>x[0]===CHARMS[rt].name&&typeof x[2]==='number'); if(pt){ if(pt[1][0]==='×') M('The Mimic',pt[2]); else A('The Mimic',pt[2]); } } }
  if(env.raid) return {odds:1, add:0, mul:1, parts:[['Raid! Odds forced to','=1']], raid:true};
  let odds=Math.max(1,Math.max(1,1+add)*mul); const oq=env.q||[];
  if(oq.includes('flat')&&mul!==1){ odds=Math.max(1,1+add); P.push(['Flat Rate','× off']); }
  if(oq.includes('vig')){ odds=Math.max(1,Math.floor(odds/2)); P.push(['The Vig','÷2']); }
  return {odds, add, mul, parts:P}; }
const fmtOdds=x=>(Math.round(x*10)/10).toString();
// final reckoning of a round
function settle(p,oRaw,R,charms,opp,env){ const q=opp.q, has=c=>charms.includes(c);
  const o=targetOf(oRaw,R,charms,q,env), N=k=>nOf(charms,k,env.rack);
  if(p<o){ const fin=!env.preview, pot=playsPot(R,{...env,score:p,done:fin})+N('haymaker')*(env.guard||0); const dk=env.drink||{}, margin=Math.max(1,o-p-N('bouncer'))+2*N('cut')+pot+3*(dk.oldf||0)+(env.deeds&&env.deeds.includes('muscle')?2:0); const O=oddsOf(R,charms,{...env,margin:o-p-N('bouncer'),score:p,done:fin});
    let dmg=Math.max(1,Math.round(margin*O.odds)), armor=false, capped=false;
    if(q.includes('soft')) dmg=Math.round(dmg*1.25); if(q.includes('thickhide')&&o-p<=2) dmg=Math.max(1,Math.ceil(dmg/2));
    if(q.includes('ironjaw')){ const cap=Math.ceil((opp.hp||1)/3); if(dmg>cap){ dmg=cap; capped=true; } }
    if(q.includes('armor')&&!env.wonOnce){ dmg=0; armor=true; }
    const recoil=q.includes('thorns')&&dmg>0?Math.min(5,Math.max(1,Math.ceil(dmg*.1))):0;
    return {winner:'you',gap:o-p,pot,margin,odds:O.odds,parts:O.parts,dmg,armor,capped,recoil,oFinal:o,raid:O.raid}; }
  if(p===o+1&&has('nearmiss')) return {winner:'push',dmg:0,oFinal:o,near:true};
  const house=p===o&&opp.sig==='house', sharp=p===o&&!house&&q.includes('sharp');
  if(p>o||house||sharp){ const gap=house?2:sharp?1:p-o, tOdds=theirOdds(opp,env); let dmg=Math.ceil(gap*tOdds);
    if(q.includes('hot')&&env.lossStreak>0) dmg+=env.lossStreak;
    if(q.includes('grudge')&&env.oppHalf) dmg+=2;
    dmg-=3*N('thick'); dmg=Math.max(1,dmg); dmg+=N('highstakes'); if(env.deeds&&env.deeds.includes('pockets')) dmg+=2; if(env.deeds&&env.deeds.includes('muscle')) dmg+=1; if(env.deeds&&env.deeds.includes('brass')) dmg=Math.min(12,dmg);
    return {winner:'them',gap,dmg,odds:tOdds,oFinal:o,house,sharp}; }
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
// ---- The floor plan (Slay the Spire style): 9 rows of up to 3 seats, drawn up front for the whole act. You climb one
// row at a time along the lines. Rows 5 and 8 are always a choice between the back alley and the bar, and every act
// has at least one bar on rows 3-4 and on rows 6-7. Lines never cross.
function wpick(w){ let t=Math.random()*Object.values(w).reduce((a,b)=>a+b,0); for(const k in w){ t-=w[k]; if(t<0) return k; } return Object.keys(w)[0]; }
function genMap(){ const rows=[];
  for(let r=0;r<9;r++){ let k;
    if(r===8) k=['B']; else if(r===0) k=['F','F','F']; else if(r===1) k=shuffle(['F','F','?']);
    else if(r===4||r===7) k=shuffle(['R','S',Math.random()<.5?'R':'S']);
    else k=[0,1,2].map(()=>wpick({F:42,E:24,'?':22,S:12}));
    rows.push(k.map((n,i)=>({n,x:r===8?1:i}))); }
  for(const [a,b] of [[2,3],[5,6]]){ if(![...rows[a],...rows[b]].some(o=>o.n==='S')) rows[pick([a,b])][rnd(3)].n='S';
    if(![...rows[a],...rows[b]].some(o=>o.n==='E')) { const c=[...rows[a],...rows[b]].filter(o=>o.n==='F'); if(c.length) pick(c).n='E'; } }
  for(let r=0;r<7;r++){ rows[r].forEach(o=>o.to=[o.x]); for(let x=0;x<2;x++){ const u=Math.random(); if(u<.45) rows[r][x].to.push(x+1); else if(u<.9) rows[r][x+1].to.push(x); } }
  { const c=[...rows[5],...rows[6]].filter(o=>o.n==='E'); const f=[...rows[5],...rows[6]].filter(o=>o.n==='F'||o.n==='?'); const h=c.length?pick(c):f.length?pick(f):null; if(h){ h.n='E'; h.hot=true; } }
  rows[7].forEach(o=>o.to=[1]); rows[8][0].to=[];
  return rows; }
// which lanes of row f you can take next, given the lane you took on the row below (trail[f-1])
function mapReach(M,f,trail){ if(f===0) return M[0].map(o=>o.x); const prev=M[f-1].find(o=>o.x===(trail||[])[f-1]); return prev?prev.to.slice():M[f].map(o=>o.x); }
// Rarity, for dice and charms alike (Balatro-style): every slot rolls common / uncommon / rare. Rares can turn up
// from the first room; they just get likelier the deeper you go.
const RARITY=[[.58,.33,.09],[.50,.36,.14],[.42,.38,.20]];
// dice lean less common than charms: there are fewer of them and a common die is a small upgrade at best
const RARITY_DICE=[[.42,.44,.14],[.36,.46,.18],[.30,.46,.24]];
function rollTier(act,W,taste){ const r=Math.random(), w=(W||RARITY)[Math.max(0,Math.min(2,act||0))], rr=w[2]*(taste?2:1); return r<1-rr-w[1]?'c':r<1-rr?'u':'r'; }
function shopDie(act,not,taste){ const t=rollTier(act,RARITY_DICE,taste), pool=SHOP_DICE.filter(d=>DT[d].tier===t&&!(not||[]).includes(d)); return pick(pool.length?pool:SHOP_DICE.filter(d=>!(not||[]).includes(d))); }
function shopDice(act,n,taste){ const out=[]; for(let i=0;i<n;i++) out.push(shopDie(act,out,taste)); return out; }
/*LOGIC-END*/

if(typeof module!=='undefined'&&module.exports) module.exports={drinkMax,sellValue,startGuard,payMod,playEvery,rackOf,mimicOf,nOf,MIMIC_FLAT,LIMIT_V2,targetOf,soak,overkillPay,playsPot,notePlays,PLAY_EVERY,LIMIT_V1,DEEDS,DEED_KEYS,hasDeed,takeDeed,handSize,genMap,mapReach,wpick,bumpLowest,PLAYS,PLAY_KEYS,playLv,playsHit,INTENTS,INTENT_W,rollIntent,intentT,theirOdds,gateDmg,tossPrice,DRINKS,DRINK_KEYS,DRINK_MAX,FINISHES,FIN_KEYS,luckyHit,finVal,FIXTURES,FIX_KEYS,fixOffer,hasFix,charmSlots,barPrice,restockPrice,CHITS,CHIT_KEYS,QUICK_WIN,CRATES,crateSize,offbookP,RULE_Q,BOSS_RULES,SHARK_RULES,jinxPick,regenOf,rulesFor,ENDLESS_GROW,OFFBOOK_P,OFFBOOK_FEE,offbook,slotsUsed,afterRound,afterFight,rollTier,shopDie,shopDice,RARITY,RARITY_DICE,ACT_HP,DT,SHOP_DICE,CHARMS,QUIRKS,ACTS,FLOORS,HAND,ACT_ODDS,rnd,pick,shuffle,facesOf,rollInst,rollFace,effVal,aiRound,makeOpp,newRound,bankVals,noteBank,oddsOf,settle,genFloors,fileDie,gildDie,canFile,canGild,LIMITS,limitMods,POCKETS,pocketStart,theirScore,breaksAt,bombDmg,isRaid,bossOf,EXTRA_Q};
