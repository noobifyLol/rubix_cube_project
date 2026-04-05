
**FIRST ITERATION**

b f r = 12 moves works 21 ms

r u l = 3 moves 1ms

l u r f = 4 moves 1ms

l b f r = 17 moves 184ms

r u f u r = 5 moves 1ms

l u f b r = failed

r u b f l = failed

b b r l = 5 moves 1ms

b l f r u = failed

r u r u r u = failed

b r f l f l = failed

l b r f u d = failed

r u d b = 16 moves 142 ms

l d b r = 4 moves 1ms

l r u f b f = failed

b r f d l l = failed

f b r u = 13 moves 20ms

l b d f = failed

u r f f b = failed

f d d l = failed

r r u l = 3 moves 1ms

b b d d = 2 moves 1ms

b r f b r f b r f = failed

r u l f b r = failed

l u f d b = failed

l u r f b = 7 moves 2ms

f r d b = failed

b f d r = failed

f u r = 3 moves 1ms

f l b r = failed

u f d b = 19 moves 45ms

f r b l u = failed

f = 1 moves 1ms

b = 1 moves 1ms

f f u u b b = 3 moves 1ms

all 3 three moves or 3 repetive moves are (n moves) and 1ms

f f b b r r l l u u d d = 6 moves 1ms

f f b b r r l l = 4 moves 1ms





**after change**

b f r = 12 moves works 21 ms

nothing change about the models everything was still the same



**After UPDATE IN PHASE 1 AND 2**

l u f b r = 5 moves 30ms

r u f b = 5ms 4 moves

d f r l = 2ms 4 moves

r u l f = failed

l u r f b d f l = failed

b d f r u = failed

b r u d = 13ms 4 moves

l u f d = 5ms 4 moves

l f u b = 3ms 4 moves

f u b f u = failed

l u f d b = 30ms 5 moves

b f d r = 13 moves 35ms

f r d b = 5ms 4 moves

r u f b l 27ms 5 moves

l r b f d u = 101ms 16 moves

r u r u r u = failed

f r u f r u = failed

r u l f b r = failed

b r f d l l = 13ms 5 moves

f d d l = 2ms 3 moves

l b r f u d = failed

b f f r l = 1ms 4 moves

d r u b d = failed

d l b u = pass

r u f b l = 21ms 5 moves





**Still needs to be Fixed**

ruru = fail

lurlub = fail

brful = 1ms 5moves

fdbur = fail

lrufb = 31ms 14moves

lrblb = 14 moves

rubld = 5moves

rludbld = fail

rulud = fail

buldud = faul

bludrf = 6 mobves

fdlbrr = fail

fulful = fail

rfbdl = 5moves

rufdb = 5

ruldbrd = fail

lurfdb = 6

ullrd = fail

rulfbdr = fail

dbfr = fail

uldrbd = 6

rbdrud = fail

rdbdbd = fail

ldrfdf = fail

rulduffb = fail

rluubdfr = 14

bdfrdlfd = fail

rfdlfud = fial

fdbddrul = fail

fduld = fail

rdfldu = 6

bdfrudl = fail

flurbdulrd = fail

fuldrbd = fail

dbdlurd = fail

dldru = fail

bdfdru = fail

rdulbdru = fail

dbdulrdf = fali

dlurdbdu = fial\

duldru = fial

bldrd = fail



**After the phase and heusmatic changes 4/2/26**

rulu = fail

lulu = fail

dudud = 1 mvoes

dud = 2 mvoes

dlubd = 5

dluldbuld = fail

ruldbdudud = fail

ludu = 3

durddurd = fail

duludl = fail

uludrd = fail

dulrd = 14

dlrudb = fail

dludrdbdlu = fail

dldbdru = fail

**4/3/26**

ururf = fail

ruruf  fail

rufur = 5 movers

lubfrd = fail

lbudrd = fail

rdburd = 6

lurddbrdr = fail

urldb = fail

fdlbf = 5

fdrbdu = fial

fudrdu = fail

ufrud = 5

lufdfr = 6

flurd = 5

r u R U = fail

url = fail

R U R' U' R' F R2 U' R' U' R U R' F' = fail

R U R U R U R U R U R U = fail

B2 L2 U' R2 B2 D F2 U L2 D' R2 F' D2 L B' D' R B2 U F' = fail

F R B L U D F2 R2 U' B' L' D2 F R' U = fail

R2 L2 U2 D2 F B R L U D F' B' R' L' U' = fail

R2 L2 U2 D2 F2 B2 R2 L2 U2 D2 F2 B2 = pass

**Group testing for a little bit**
rur'u' still calls errors maximum stack call.
so does ruru 

so does some singular moves ex. R,d,l

but not, b,u,f

fr, du works

lur is exhuated

ruf error

rulf = backup

dbdlu = max

lurd = backkup

fr= works

bdrfdr = backup

ulurd = backup

rud = error

rufur = error

dfdf = error

ruru = error
lbdr = error
fud = works
fudfud = error
rrll = works
u2 = works
uul = error
fd = works
fb= works
fr = works
lfd = error
bdf = error
lrrf = error
fddf = works
bdfdr = error
rd = error
rb = error
rl = works 
rr = works
ru = works
r = error

**After massive recursive guard update**
ruru = wors
fufu = fails
rufur = works
fdbl = fails
rufurrufur = fails
rdburd = workks again
dulrd = works
flurd = fail
dudud = worsk
lr = works
dud = works 
rb = works
dlubd = works
rururururu = fail
lrufb = 31ms 14moves

lrblb = 14 moves

rubld = 5moves
brful = fail
l r b f d u = 101ms 16 moves
l u f d = works

l f u b = FAIL

f u b f u = failed

l u f d b = FAIL

b f d r = FAIL

f r d b = FAIL

r u f b l FAIL

rlubd = works
rrlldd = works
lurddb = fail
drduld = fail
uldd = works
bduldldr = fails
dlud = works
rudlrd= fail
dbdulrd = fails
rdldd = fails
frdfdr = fails
frd = works
frdl = fails
fdlbd = fails
fdurd = works
furfd = faiol
frfrfr = fail
lfdrf = f
fdfdfd = f



