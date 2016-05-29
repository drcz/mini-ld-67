/// -- PUSHILLADE --
/// an 8 hour fast js remix of the_pchanina
/// (cf https://github.com/drcz/dercz9000)
/// 2016.05.29, Alicante, drcz@tlen.pl
/// prepared for mini Ludum Dare 67
///////////////////////////////////////////////////////////


/// global shit
var GAME_STATE = 'TITLE';
var THE_WORLD = {};
var COURTAIN = 0;
var MAX_COURTAIN = 13;
var LIVES = 4;
var NIDERITE_LEFT = 0;
var LEVEL = 0;

var MSG = {'text':'','expires':0};
var FONT_COLOR = '#00ff00'

/// the world copy'n'paste from our brave ego-block "engine":
var mk_world = function(level) { /// TODO sure?
    return({'things':level, 'facts':[]});
};

/// world's "selectors". ///////////////////////////////////////////////////////
var find_all_by_label = function(world, label) {
    var found=[];
    for(var i=0;i<world.things.length;i++) {
	var thing=world.things[i];
	if(thing!=null && thing.label==label) found.push(thing);
    }
    return(found);
};

var find_by_pos = function(world, x,y) {
    if(x<0 || y<0 || x>=MAP_W || y>=MAP_H) return({'type':'DIRT'});
    for(var i=0;i<world.things.length;i++) {
	var thing=world.things[i];
	if(thing!=null && thing.x==x && thing.y==y) return(thing);
    }
    return(null);
};

var find_actor = function(world) {
    for(var i=0;i<world.things.length;i++) {
	var thing=world.things[i];
	if(thing!=null
	   && (thing.type=='ACTOR')) return(thing);
    }
    return(null); /// wtf?
};


/// world's "modifiers". ///////////////////////////////////////////////////////
var insert_thing = function(world, thing) {
    thing.index=world.things.length;
    world.things[thing.index]=thing;
//    world=notice(world,['INS',thing]); //dbg
    return(world);
};

var update_thing = function(world, thing) {
    if(world.things[thing.index]!=null)
	world.things[thing.index]=thing;
//    world=notice(world,['UPD',thing.type,thing]); //dbg
    return(world);
};

var delete_thing = function(world, thing) {    
    world.things[thing.index]=null;
//    world=notice(world,['DEL',thing]); //dbg
    return(world);
};

/// after all the world-operations, remove the empty "slots",
/// and update the indexes.
/// (this is because the game cycle uses "for" loop, during which
///  some things can get deleted; but the indexes should remain
///  the same till the end of the loop, because it's a "for" y'know.)
var new_world_order = function(world) {
    var new_things=[];
    for(var i=0;i<world.things.length;i++) {
	var thing=world.things[i];
	if(thing!=null) {
	    thing.index=new_things.length;
	    new_things[thing.index]=thing;
	}
    }
    world.things=new_things;
    return(world);
};

/// log certain triplets, or whatever...
var notice = function(world, fact) {
//    console.log(fact); // dbg !!
    world.facts.push(fact);
    return(world);
};

/// do this when the new cycle starts (i guess).
var forget_facts = function(world) {
    world.facts = [];
    return(world);
};


/// now some mechanics:

var c_nothing = function(world, active,passive) {
    return(world);
};

var c_bump = function(world, active,passive) {
    active.dx*=-1;
    active.dy*=-1;
    world = update_thing(world, active);
    world = notice(world,'BUMP');
    return(world);
};

var c_stop = function(world, active,passive) {
    active.dx = 0;
    active.dy = 0;
    world = update_thing(world, active);
    world = notice(world,'STOP');
    return(world);
};

var c_push =  function(world, active,passive) {
    passive.dx = active.dx;
    passive.dy = active.dy;
    world = update_thing(world, passive);
    world = notice(world,'PUSH');
    return(world);
};

var c_pickup = function(world, active,passive) {
    if(active.keys==undefined) active.keys=0;
    active.keys++;
    world = notice(world,'PICKUP');
    world = delete_thing(world, passive);
    world = update_thing(world, active);
    return(world);
};

var c_open = function(world, active,passive) {
    if(active.keys>0) {
	active.keys--;
	world = delete_thing(world, passive);
	world = update_thing(world, active);
    world = notice(world,'OPEN');
    } else {
    world = notice(world,'NO KEY');
    }
    return(world);
};

var c_kill = function(world, active,passive) {
    world = delete_thing(world, passive);
    world = notice(world,'ANT DIES');
    return(world);
};

var c_die = function(world, active,passive) {
    world = notice(world,'DEATH');
    return(world);
};

var c_anihillate = function(world, active,passive) {
    world = delete_thing(world, passive);
    world = delete_thing(world, active);
    world = notice(world,'ANIHILLATE');
    return(world);
};



var collisions = {
    'ACTOR|KEY': c_pickup,
    'ACTOR|LOCK': c_open,
    'ACTOR|ANT': c_die,
    'ACTOR|NIDERITE': c_push,
    'ANT|ACTOR': c_die,
    'ANT|*': c_bump,
    'NIDERITE|ANT': c_kill,
    'NIDERITE|NIDERITE': c_anihillate,
    'NIDERITE|*': c_stop    
};

var collision_for = function(active, passive) {
    /// NB: if in need of some unique collison, add it here!
    var collision = collisions[active.type+'|'+passive.type];    
    if(collision!=undefined) return(collision);
    /// ok, try less specific wrt passive.
    collision = collisions[active.type+'|*'];
    if(collision!=undefined) return(collision);
    /// mhm, try less specific wrt active.
    collision = collisions['*|'+passive.type];
    if(collision!=undefined) return(collision);
    /// no idea then.
    return(c_nothing);
};

var move_thing = function(world, thing,x,y) {
    if(thing == null) return(world); /// defensive...
    var obstacle = find_by_pos(world,x,y);
    if(obstacle == null) {
	thing.x = x;
	thing.y = y;
	world = update_thing(world, thing);
    } else {
	world = (collision_for(thing, obstacle))(world, thing,obstacle);
    }
    return(world);
};


var world_step = function(world) {
    for(var i=0;i<world.things.length;i++) {
	var thing=world.things[i];
	if(thing==null) continue;
	switch(thing.type) {
	case 'ACTOR':
	    if(the_joystick.dx!=0 || the_joystick.dy!=0) {
		thing.dx=the_joystick.dx;
		thing.dy=the_joystick.dy;
		world = update_thing(world, thing);
		var nx = thing.x+thing.dx;
		var ny = thing.y+thing.dy;
		world = move_thing(world, thing,nx,ny);
		reset_joystick();
	    }
	    break;
	case 'ANT':
	case 'NIDERITE':
	    if(thing.dx!=0 || thing.dy!=0) {
		var nx = thing.x+thing.dx;
		var ny = thing.y+thing.dy;
		world = move_thing(world, thing,nx,ny);
	    }
	    break;
	}
    }
    world = new_world_order(world);
    return(world);
};

/// levels stuff...
var MAP_W = 23; /// heil
var MAP_H = 23; /// Eris

var init_level = function(n) {
    var things = [];
    LEVEL = n;
    NIDERITE_LEFT = 0;
    for(var j=0;j<MAP_H;j++)
	for(var i=0;i<MAP_W;i++) {
	    var t=false;
	    switch(Levels[n][j][i]) {	
	    case ' ': t={'type':'DIRT'}; break;
	    case '#': t={'type':'WALL'}; break;
	    case 'k': t={'type':'KEY'}; break;
	    case 'l': t={'type':'LOCK'}; break;
	    case 'O': NIDERITE_LEFT++; t={'type':'NIDERITE', 'dx':0, 'dy':0}; break;
	    case 's': t={'type':'ACTOR', 'dx':0,'dy':1,'keys':0}; break;
	    case '>': t={'type':'ANT', 'dx':1, 'dy':0}; break;
	    case '<': t={'type':'ANT', 'dx':-1, 'dy':0}; break;
	    case '^': t={'type':'ANT', 'dx':0, 'dy':-1}; break;
	    case 'v': t={'type':'ANT', 'dx':0, 'dy':1}; break;
	    }
	    if(t) {
		t.x=i; t.y=j; things.push(t);
	    }
	}
    return(new_world_order(mk_world(things)));
};

var Levels = [
  /// LEVEL 1
  [" #####           ##### ",
   "##.#.##         ##.#.##",
   "#.....#         #.....#",
   "##.#.## ####### ##.#.##",
   "#.....# #..O..# #.....#",
   "###########.###########",
   "#.......# #.# #.......#",
   "#......## #.# ##......#",
   "#......#  #.#  #......#",
   "#......#  #.#  #v.....#",
   "#......####.####.v....#",
   "#.................v...#",
   "#......###.O.###...v..#",
   "#.....^# #...# #....v.#",
   "#....^.###.O.###.....v#",
   "#...^.................#",
   "#..^...####s####......#",
   "#.^....#  #.#  #......#",
   "#^.....# ##.## #......#",
   "#......# #...# #......#",
   "######## #.O.# ########",
   " ##      #...#      ## ",
   "  #       ###       #  "],
  /// LEVEL 2
  ["        ###            ",
   "  ###   #v##           ",
   " ##.##  #.###          ",
   " #...#  #.########     ",
   " ##.##  #.......O#     ",
   "  ###   #.######O#     ",
   "        #.......O#     ",
   "        #.######.#     ",
   "     ####.######.#     ",
   "     #v..OO..###.#     ",
   "     #.......###.#     ",
   "######...s...###l######",
   " ##...<..........#     ",
   "  ####...........#     ",
   "     ####.O.O.O..#     ",
   "        #........#     ",
   "        #........####  ",
   "        #>..........#  ",
   "        #.###########  ",
   "        #k#            ",
   "        ###            ",
   "        #              ",
   "        #              "],
  /// LEVEL 3
  ["     #     #     #     ",
   "    ###############    ",
   "    #>............#    ",
   "  ###l###########l###  ",
   " ##v....O#  ##O....v## ",
   " #...##..O# #...##...# ",
   " #^..##...# #...##..^# ",
   " ##.O...O.####...O..## ",
   "  #.##.....#....#####  ",
   "  #.######O#O#### #v#  ",
   " ##.###.##O#O#..###.## ",
   " #...................# ",
   " #..###############..# ",
   " #..#    #####    #..# ",
   " #..#   ##...##   #.^# ",
   " #..#####..s..#####..# ",
   " #...O..O.....O..O...# ",
   " #^..####..O..####...# ",
   " #########...######### ",
   "      #>.......k#      ",
   "      #####O#####      ",
   "   ####   ###   ####   ",
   "      #         #      "],
  /// LEVEL 4
  ["###             #######",
   "#k#     ######  #.....#",
   "#.##    #....#  #.###.#",
   "#.#######.##.####.# #.#",
   "#.##...l.s##....O.# #.#",
   "#....###..##.##.#####.#",
   "###### #..##O##.......#",
   "       #..#...####O####",
   " #######..########.#   ",
   " #.O...O...........#   ",
   " #.#####OO########.#   ",
   " #.#   #..#      #O####",
   " #.#####..###### #....#",
   " #..........v..# ###..#",
   " #.#####OO##.#l# #...O#",
   " #.#   #^^##.#.###.O###",
   " #.#########.#......#  ",
   " #^..........########  ",
   " #.###########         ",
   " #.#                   ",
   " #.#############       ",
   " #............k#       ",
   " ###############       "],
  /// LEVEL 5
  [ "#######################",
    "#.....<#.......<..#.Ok#",
    "#.##...#.........<#..##",
    "#.##.O.O.##.#######..# ",
    "#.##..##.#.....O.##..##",
    "#.s...#..#..#.#..#....#",
    "#.....##.#..#.#.##....#",
    "#####O##....#.###.O.OO#",
    "#......###..#.##.....##",
    "#..#...OO#^......##^###",
    "#.....##.####O#######.#",
    "#O....O...............#",
    "###################...#",
    " #.....<#####....##l###",
    " #.#..#.O......####.#  ",
    " #....v.#.###.......#  ",
    " #..##..#.#########O###",
    " #......#.............#",
    " #..##..###O#######.###",
    " #.^....###O##>..##.#  ",
    " #.#..#.....###..##O#  ",
    " #>.....##### #O.O..#  ",
    " ########     #######  "]
    /// some more?
];


/// and some input stuff:
var the_joystick = {'dx':0, 'dy':0};
var reset_joystick = function() { the_joystick.dx = 0; the_joystick.dy = 0; }

window.addEventListener('keydown',
			function(evt) {
			    switch(evt.keyCode) {
			    case 37: // left arr.
			    case 65: // A
				the_joystick.dx=-1; the_joystick.dy=0; break;
			    case 39: // right arr.
			    case 68: // D
				the_joystick.dx=1; the_joystick.dy=0; break;
			    case 38: /// up arr.
				evt.preventDefault(); /// no scrolling
			    case 87: /// W
				the_joystick.dx=0; the_joystick.dy=-1;
				break;
			    case 40: // down arr.
				evt.preventDefault(); /// no scrolling
			    case 83: // S
				the_joystick.dx=0; the_joystick.dy=1;
				break;
			    }
			},
			false);

/// ... try mouse click/tap as well
var min_index = function(arr) {
    var i=0;
    for(var j=1;j<arr.length;j++) {
	if(arr[j]<arr[i]) i=j;
    }
    return i;
};

document.onmousedown = function(e) {
    if(e.offsetX>0 && e.offsetX<480 && e.offsetY>0 && e.offsetY<384) {
	var d_left = e.offsetX;
	var d_right = 480-e.offsetX;
	var d_up = e.offsetY;
	var d_down = 384-e.offsetY;
	var dir_arr = [d_left,d_right,d_up,d_down];
	var dir = min_index(dir_arr);
	reset_joystick();
	switch(dir) {
	case 0: the_joystick.dx=-1; break;
	case 1: the_joystick.dx=1; break;
	case 2: the_joystick.dy=-1; break;
	case 3: the_joystick.dy=1; break;
	}
    }
};


/// "config"
var spr_w = 8;
var spr_h = 8;
var scale_w = 4;
var scale_h = 4;

/// misc:
var rand = function(lo,hi) { return(lo+Math.floor(Math.random()*(hi-lo+1))); };

/// Sprites stuff:
var mk_sprite = function(color,bits) {
    var canvas = document.createElement('canvas');
    canvas.width = spr_w*scale_w;
    canvas.height = spr_h*scale_h;
    var context = canvas.getContext('2d');
    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    for(var j=0; j<spr_h; j++)
	for(var i=0; i<spr_w; i++)
	    if(bits[j][i] == '1')
		context.fillRect(i*scale_w,j*scale_h,scale_w,scale_h);
    return canvas;
};

/// generated from c original with ruby...
var Sprites = {
    'S_EMPTY': mk_sprite('#000000', [
	"00000000",
	"00000000",
	"00000000",
	"00000000",
	"00000000",
	"00000000",
	"00000000",
	"00000000"
    ]),
    'S_DIRT' : mk_sprite('#000099', [
	"10101010",
	"01010101",
	"10101010",
	"01010101",
	"10101010",
	"01010101",
	"10101010",
	"01010101"
    ]),
    'S_WALL' : mk_sprite('#0000ff', [
	"01111110",
	"10000001",
	"10000001",
	"10000101",
	"10000101",
	"10001101",
	"10000001",
	"01111110"
    ]),
    'S_KEY' : mk_sprite('#ffff00', [
	"00000000",
	"00000000",
	"00000000",
	"11100000",
	"10111111",
	"11100101",
	"00000000",
	"00000000"
    ]),
    'S_LOCK' : mk_sprite('#ff00ff', [
	"00111100",
	"01000010",
	"01000010",
	"01111110",
	"01011110",
	"01111110",
	"01111110",
	"00000000"
    ]),
    'S_NIDERITE' : mk_sprite('#ffffff', [
	"00000000",
	"00011000",
	"00101100",
	"01001110",
	"01111110",
	"00111100",
	"00011000",
	"00000000"
    ]),
    'S_NIDERITE2' : mk_sprite('#ffffff', [
	"00000000",
	"00011000",
	"00101100",
	"01001110",
	"01110010",
	"00110100",
	"00011000",
	"00000000"
    ]),
    'S_ANT_U' : mk_sprite('#ff0000', [
	"01000010",
	"00111100",
	"00011000",
	"00011001",
	"11111110",
	"00111100",
	"01011010",
	"10000010"
    ]),
    'S_ANT_D' : mk_sprite('#ff0000', [
	"01000001",
	"01011010",
	"00111100",
	"01111111",
	"10011000",
	"00011000",
	"00111100",
	"01000010"
    ]),
    'S_ANT_L' : mk_sprite('#ff0000', [
	"00010000",
	"10001011",
	"01001100",
	"01111110",
	"01111110",
	"01001100",
	"10001010",
	"00001001"
    ]),
    'S_ANT_R' : mk_sprite('#ff0000', [
	"00001000",
	"11010001",
	"00110010",
	"01111110",
	"01111110",
	"00110010",
	"01010001",
	"10010000"
    ]),
    'S_ANT_U2' : mk_sprite('#ff0000', [
	"01000010",
	"00111100",
	"00011000",
	"10011000",
	"01111111",
	"00111100",
	"01011010",
	"01000001"
    ]),
    'S_ANT_D2' : mk_sprite('#ff0000', [
	"10000010",
	"01011010",
	"00111100",
	"11111110",
	"00011001",
	"00011000",
	"00111100",
	"01000010"
    ]),
    'S_ANT_L2' : mk_sprite('#ff0000', [
	"00001001",
	"10001010",
	"01001100",
	"01111110",
	"01111110",
	"01001100",
	"10001011",
	"00010000"
    ]),
    'S_ANT_R2' : mk_sprite('#ff0000', [
	"10010000",
	"01010001",
	"00110010",
	"01111110",
	"01111110",
	"00110010",
	"11010001",
	"00001000"
    ]),
    'S_ACTOR_U' : mk_sprite('#ffffff', [
	"01111110",
	"10000001",
	"10000001",
	"01011010",
	"00111100",
	"10111101",
	"10111101",
	"00000100"
    ]),
    'S_ACTOR_D' : mk_sprite('#ffffff', [
	"01111110",
	"10000001",
	"10100101",
	"01000010",
	"00111100",
	"10111101",
	"10111101",
	"00100000"
    ]),
    'S_ACTOR_L' : mk_sprite('#ffffff', [
	"00111100",
	"01000010",
	"01010010",
	"01000010",
	"00111100",
	"00011000",
	"00111000",
	"00011000"
    ]),
    'S_ACTOR_R' : mk_sprite('#ffffff', [
	"00111100",
	"01000010",
	"01001010",
	"01000010",
	"00111100",
	"00011000",
	"00011100",
	"00011000"
    ]),
    'S_ACTOR_U2' : mk_sprite('#ffffff', [
	"01111110",
	"10000001",
	"10000001",
	"01011010",
	"00111100",
	"10111101",
	"10111101",
	"00100000"
    ]),
    'S_ACTOR_D2' : mk_sprite('#ffffff', [
	"01111110",
	"10000001",
	"10100101",
	"01000010",
	"00111100",
	"10111101",
	"10111101",
	"00000100"
    ]),
    'S_ACTOR_L2' : mk_sprite('#ffffff', [
	"00111100",
	"01000010",
	"01010010",
	"01000010",
	"00111100",
	"00011000",
	"00111100",
	"01100100"
    ]),
    'S_ACTOR_R2' : mk_sprite('#ffffff', [
	"00111100",
	"01000010",
	"01001010",
	"01000010",
	"00111100",
	"00011000",
	"00111000",
	"00110110"
    ]),
    'S_ACTOR_DEAD' : mk_sprite('#ffffff', [
	"00000000",
	"00000010",
	"00100000",
	"00000100",
	"00110000",
	"01001110",
	"01111110",
	"00000000"
    ]),
    'S_ACTOR_DEAD2' : mk_sprite('#ffffff', [
	"00000000",
	"01000000",
	"00010000",
	"00000000",
	"00110010",
	"01001110",
	"01111110",
	"00000000"
    ]),
    'S_HEART' : mk_sprite('#ff0000', [
	"00000000",
	"00100010",
	"01110111",
	"01111111",
	"01111111",
	"00111110",
	"00011100",
	"00001000"
    ]),

    /// plus our "fonts":
'A' : mk_sprite(FONT_COLOR, [
"00000000",
"11111110",
"11000110",
"11000110",
"11111110",
"11000110",
"11000110",
"11000110",
]),
'B' : mk_sprite(FONT_COLOR, [
"00000000",
"11111100",
"11001100",
"11001100",
"11111110",
"11000110",
"11000110",
"11111110",
]),
'C' : mk_sprite(FONT_COLOR, [
"00000000",
"11111100",
"11000000",
"11000000",
"11000000",
"11000000",
"11000000",
"11111110",
]),
'D' : mk_sprite(FONT_COLOR, [
"00000000",
"11111100",
"11001100",
"11001100",
"11000110",
"11000110",
"11000110",
"11111110",
]),
'E' : mk_sprite(FONT_COLOR, [
"00000000",
"11111100",
"11000000",
"11000000",
"11111100",
"11000000",
"11000000",
"11111110",
]),
'F' : mk_sprite(FONT_COLOR, [
"00000000",
"11111110",
"11000000",
"11000000",
"11111100",
"11000000",
"11000000",
"11000000",
]),
'G' : mk_sprite(FONT_COLOR, [
"00000000",
"11111100",
"11000000",
"11000000",
"11001110",
"11000110",
"11000110",
"11111110",
]),
'H' : mk_sprite(FONT_COLOR, [
"00000000",
"11000110",
"11000110",
"11000110",
"11111110",
"11000110",
"11000110",
"11000110",
]),
'I' : mk_sprite(FONT_COLOR, [
"00000000",
"00110000",
"00110000",
"00110000",
"00110000",
"00110000",
"00110000",
"00110000",
]),
'J' : mk_sprite(FONT_COLOR, [
"00000000",
"00000110",
"00000110",
"00000110",
"00000110",
"00000110",
"00100110",
"00111110",
]),
'K' : mk_sprite(FONT_COLOR, [
"00000000",
"11001100",
"11001100",
"11110000",
"11001000",
"11000110",
"11000110",
"11000110",
]),
'L' : mk_sprite(FONT_COLOR, [
"00000000",
"11000000",
"11000000",
"11000000",
"11000000",
"11000000",
"11000000",
"11111110",
]),
'M' : mk_sprite(FONT_COLOR, [
"00000000",
"11000110",
"11000110",
"11101110",
"11010110",
"11000110",
"11000110",
"11000110",
]),
'N' : mk_sprite(FONT_COLOR, [
"00000000",
"11000110",
"11000110",
"11100110",
"11010110",
"11001110",
"11000110",
"11000110",
]),
'O' : mk_sprite(FONT_COLOR, [
"00000000",
"11111110",
"11000110",
"11000110",
"11000110",
"11000110",
"11000110",
"11111110",
]),
'P' : mk_sprite(FONT_COLOR, [
"00000000",
"11111100",
"11000110",
"11000110",
"11111110",
"11000000",
"11000000",
"11000000",
]),
'Q' : mk_sprite(FONT_COLOR, [
"00000000",
"11111110",
"11000110",
"11000110",
"11000110",
"11010110",
"11011110",
"11111110",
]),
'R' : mk_sprite(FONT_COLOR, [
"00000000",
"11111100",
"11000110",
"11000110",
"11111110",
"11001000",
"11000110",
"11000110",
]),
'S' : mk_sprite(FONT_COLOR, [
"00000000",
"11111100",
"11000000",
"11000000",
"11111110",
"00000110",
"11000110",
"11111110",
]),
'T' : mk_sprite(FONT_COLOR, [
"00000000",
"11111110",
"00110000",
"00110000",
"00110000",
"00110000",
"00110000",
"00110000",
]),
'U' : mk_sprite(FONT_COLOR, [
"00000000",
"11000110",
"11000110",
"11000110",
"11000110",
"11000110",
"11000110",
"11111110",
]),
'V' : mk_sprite(FONT_COLOR, [
"00000000",
"11000110",
"11000110",
"11000110",
"11000110",
"01000100",
"01101100",
"00111000",
]),
'W' : mk_sprite(FONT_COLOR, [
"00000000",
"11000110",
"11000110",
"11000110",
"11010110",
"11101110",
"11000110",
"11000110",
]),
'X' : mk_sprite(FONT_COLOR, [
"00000000",
"11000110",
"11000110",
"01101100",
"00111000",
"01101100",
"11000110",
"11000110",
]),
'Y' : mk_sprite(FONT_COLOR, [
"00000000",
"11000110",
"11000110",
"01101100",
"00111000",
"00110000",
"00110000",
"00110000",
]),
'Z' : mk_sprite(FONT_COLOR, [
"00000000",
"11111100",
"00001100",
"00001100",
"01111100",
"11000000",
"11000000",
"11111110",
])
};


/// drawin...
var anim_frame = 0;
var walk_frame = 0;
var tile_w = spr_w*scale_w;
var tile_h = spr_h*scale_h;
var viewport_dw = 7;
var viewport_dh = 5;

var display_board=function(world,dead,courtain,msg) {
    anim_frame++;
    anim_frame %= 2;
    var hero = find_actor(world);
    var x = 0, y = 0;
    for(var j=hero.y-viewport_dh;j<=hero.y+viewport_dh;j++) {
	for(var i=hero.x-viewport_dw;i<=hero.x+viewport_dw;i++) {
	    var thing = find_by_pos(world, i,j);
	    var spr = 'S_EMPTY';
	    if(thing && y<courtain) {
		switch(thing.type) {
		case 'WALL': spr='S_WALL'; break;
		case 'DIRT': spr='S_DIRT'; break;
		case 'KEY': spr='S_KEY'; break;
		case 'LOCK': spr='S_LOCK'; break;

		case 'NIDERITE':
		    spr='S_NIDERITE';
		    if(rand(0,13)==7) spr+='2'; /// 'blink'
		    break;

		case 'ANT':
		    spr='S_ANT';
		    if(thing.dx>0) spr+='_R';
		    else if(thing.dx<0) spr+='_L';
		    else if(thing.dy>0) spr+='_D';
		    else if(thing.dy<0) spr+='_U';
		    if(anim_frame) spr+='2';
		    break;

		case 'ACTOR':
		    if(dead) {
			spr='S_ACTOR_DEAD';
			if(rand(0,1)==1) spr+='2'; // :)
		    } else {
			spr='S_ACTOR';
			if(thing.dx>0) spr+='_R';
			else if(thing.dx<0) spr+='_L';
			else if(thing.dy>0) spr+='_D';
			else if(thing.dy<0) spr+='_U';
			if(anim_frame
			   && (the_joystick.dx!=0  /// moving?
			       || the_joystick.dy!=0)) {
			    spr+='2';
			}
		    }
		    break;
		    
		}
	    }	    
	    kontekst.drawImage(Sprites[spr],x*tile_w,y*tile_h);
	    x++;
	}
	x = 0;
	y++;
    }
    /// statusbox:
    for(var i=0;i<LIVES-(dead&&anim_frame?1:0);i++) {
	kontekst.drawImage(Sprites['S_HEART'],x++*tile_w,y*tile_h);
    }    
    while(x<(2*viewport_dw+1)-hero.keys) {
	kontekst.drawImage(Sprites['S_EMPTY'],x++*tile_w,y*tile_h);
    }
    for(var i=0;i<hero.keys;i++) {
	kontekst.drawImage(Sprites['S_KEY'],x++*tile_w,y*tile_h);
    }
    /// message?
    if(MSG.expires>0) {
	write_centered_line(MSG.text,(viewport_dh-1)*tile_h);
	MSG.expires--;
    }
}

/// text writin...
var write_line = function(txt,x,y) {
    txt=txt.toUpperCase();
    for(var i=0;i<txt.length;i++) {
	var ch = Sprites[txt[i]];
	if(ch==undefined) ch=Sprites['S_EMPTY'];
	kontekst.drawImage(ch, x,y);
	x+=tile_w;
    }
};

var write_centered_line = function(txt,y) {
    var mx = Math.round(((2*viewport_dw+1)-txt.length)/2);
    write_line(txt,mx*tile_w,y);
};

/// "sounds" ;)
var load_sound = function(url,max) {
    var smpls = [];
    for(var i=0;i<max;i++) {
        smpls.push(new Audio(url));
    }
    return {"samples":smpls,"index":0,"max":max};
};

var Sounds = {
    'low_beep': load_sound('beep2.ogg',3),
    'high_beep': load_sound('beep.ogg',3)
};

var PLAY=function(type,vol) {
    var s = Sounds[type];
    s.index = ++s.index%s.max;
    snd = s.samples[s.index];
    snd.volume = vol;
    snd.play();
};


/// "MAIN"... ////////////////////////////////////////////////////
var kanwa=document.getElementById("ekraniszcze");
var kontekst=kanwa.getContext("2d");
var saundtrak=document.getElementById("soundtrack");

var short_flash = function() {
    kontekst.fillStyle="#ffffff";
    kontekst.fillRect(0,0,480,384); /// how uncool is that? ;)
}

var main_loop = function() {
    switch(GAME_STATE) {

    case 'PLAY':
	display_board(THE_WORLD, false,MAX_COURTAIN,MSG);
	THE_WORLD = world_step(THE_WORLD);
	for(var i=0;i<THE_WORLD.facts.length;i++) {
	    switch(THE_WORLD.facts[i]) {
	    case 'DEATH':
		GAME_STATE='FADEOUT_DEATH';
		MSG.text='YOU DIE';
		MSG.expires=10;
		PLAY('low_beep',1.0);
		break;

	    case 'ANIHILLATE':
		NIDERITE_LEFT-=2;
		//short_flash();
		switch(rand(1,5)) {
		case 1:MSG.text='WELL DONE';break;
		case 2:MSG.text='NICE';break;
		case 3:MSG.text='SWEET';break;
		case 4:MSG.text='COOL';break;
		case 5:MSG.text='GOOD';break;
		}
		MSG.expires=3;
		if(NIDERITE_LEFT<=0) {
		    GAME_STATE='FADEOUT_LEVELUP';
		    MSG.text='LEVEL COMPLETE';
		    MSG.expires=10;
		}
		PLAY('high_beep',1.0);
		break;

	    case 'PICKUP':
		MSG.text='GOT A KEY';
		MSG.expires=4;
		PLAY('high_beep',1.0);
		break;

	    case 'OPEN':
		MSG.text='DOOR UNLOCKS';
		MSG.expires=4;
		PLAY('high_beep',1.0);
		break;

	    case 'NO KEY':
		MSG.text='YOU NEED A KEY';
		MSG.expires=5;
		PLAY('low_beep',1.0);
		break;

		/// todo more sounds??

	    }
	}
	THE_WORLD = forget_facts(THE_WORLD);		
	/// todo odejmowanie niderytu i fadeout'y
	break;

    case 'FADE_IN':
	display_board(THE_WORLD, false,COURTAIN,MSG);
	if(COURTAIN++ > MAX_COURTAIN) GAME_STATE='PLAY';	
	reset_joystick();
	break;

    case 'FADEOUT_DEATH':
	display_board(THE_WORLD, true,COURTAIN,MSG);	
	if(COURTAIN-- <= 0) {
	    if(--LIVES>0) {
		GAME_STATE='FADE_IN';
		MSG.text='GET READY';
		MSG.expires=9;
		THE_WORLD = init_level(LEVEL);
	    } else {
		GAME_STATE = 'GAMEOVER';
		MSG.text='GAME OVER';
		MSG.expires=23;
	    }
	}
	reset_joystick();
	break;

    case 'FADEOUT_LEVELUP':
	display_board(THE_WORLD, false,COURTAIN,MSG);	
	if(COURTAIN-- <= 0) {	    
	    if(++LEVEL >= Levels.length) {
		GAME_STATE = 'VICTOLY';
	    } else {
		GAME_STATE='FADE_IN';
		MSG.text='GET READY';
		MSG.expires=9;
		THE_WORLD = init_level(LEVEL);
	    }
	}
	reset_joystick();
	break;

    case 'TITLE':
	saundtrak.volume=0.99;
	THE_WORLD = mk_world([{'type':'ACTOR','x':13,'y':13,'dx':0,'dy':1,'keys':0}]);
	LIVES=0;
	COURTAIN=0;
    	MSG.text='PUSHILLADE';
	MSG.expires=23;
	display_board(THE_WORLD, false,COURTAIN,MSG);	
	write_centered_line('any move',(viewport_dh+4)*tile_h);	
	write_centered_line('to start',(viewport_dh+5)*tile_h);
	
	if(the_joystick.dx!=0 || the_joystick.dy!=0) {
	    saundtrak.volume=0.66;
	    MSG.text='GET READY';
	    MSG.expires=9;
	    LEVEL=0;
	    LIVES=3;
	    THE_WORLD=init_level(LEVEL);
	    GAME_STATE='FADE_IN';
	    COURTAIN=0;
	    reset_joystick();
	}
	break;

    case 'GAMEOVER':
	THE_WORLD = mk_world([{'type':'ACTOR','x':13,'y':13,'dx':0,'dy':1,'keys':0}]);
	LIVES=0;
	COURTAIN=MAX_COURTAIN;
    	MSG.text='GAME OVER';
	MSG.expires=23;
	display_board(THE_WORLD, true,COURTAIN,MSG);	
	write_centered_line('any move',(viewport_dh+4)*tile_h);	
	if(the_joystick.dx!=0 || the_joystick.dy!=0) {
	    GAME_STATE = 'TITLE';
	    reset_joystick();
	}
	break;

    case 'VICTOLY':
	THE_WORLD = mk_world([{'type':'ACTOR','x':13,'y':13,'dx':0,'dy':1,'keys':0}]);
	LIVES=0;
	COURTAIN=MAX_COURTAIN;
    	MSG.text='VICTOLY';
	MSG.expires=23;
	the_joystick.dy=1;
	display_board(THE_WORLD, false,COURTAIN,MSG);
	break;

    }
};

setInterval(main_loop,167);


