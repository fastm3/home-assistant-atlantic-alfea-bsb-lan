
# Blockout synoptique Alfea Duo - plain-pied, coupe maison
# Config emetteurs : modifier puis relancer ce script dans Blender
EMETTEURS = {"C1": "radiateur", "C2": "plancher"}   # pour l'instant seule cette combinaison est routee
N_BOUCLES_C2 = 2

import bpy, bmesh, math
from mathutils import Vector

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for c in list(bpy.data.collections): bpy.data.collections.remove(c)
for d in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for b in list(d):
        if b.users == 0: d.remove(b)
scn = bpy.context.scene
C = {}
def coll(name, parent=None):
    c = bpy.data.collections.new(name); (parent or scn.collection).children.link(c); C[name]=c; return c
for n in ["Maison","Exterieur","Module","Frigo","Liaisons_C1","Liaisons_C2"]: coll(n)
coll("SLOT_C1"); coll("SLOT_C2")

def mat(name, rgb, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    b.inputs["Base Color"].default_value=(*rgb,1); b.inputs["Roughness"].default_value=rough
    b.inputs["Metallic"].default_value=metal; m.diffuse_color=(*rgb,1); return m
M = {k: mat(*v) for k,v in {
 "plaster":("M_Enduit_Interieur",(0.80,0.78,0.74)), "facade":("M_Enduit_Facade",(0.62,0.60,0.57)),
 "block":("M_Parpaing",(0.48,0.47,0.45)), "wallins":("M_Isolant_Mur",(0.85,0.82,0.55)),
 "concrete":("M_Dalle_Beton",(0.42,0.42,0.43)), "floorins":("M_Isolant_Sol",(0.70,0.78,0.85)),
 "screed":("M_Chape",(0.66,0.63,0.58)), "tile":("M_Carrelage",(0.86,0.83,0.78),0.25),
 "ground":("M_Gazon",(0.18,0.32,0.12)), "gravel":("M_Gravier",(0.5,0.48,0.45)), "soil":("M_Terre",(0.25,0.18,0.12)),
 "casing":("M_Carrosserie",(0.92,0.92,0.93),0.35), "grille":("M_Grille",(0.05,0.05,0.06)),
 "tank":("M_Cuve",(0.7,0.72,0.75),0.3,1.0), "copper":("M_Cuivre",(0.85,0.45,0.25),0.3,1.0),
 "resist":("M_Resistance",(1.0,0.75,0.1)), "hydro":("M_BlocHydro",(0.25,0.27,0.3)),
 "exch":("M_Echangeur",(0.9,0.55,0.2),0.3,0.8), "pump":("M_Circulateur",(0.1,0.3,0.6)),
 "brass":("M_Laiton",(0.8,0.65,0.25),0.3,1.0),
 "hot":("M_Depart_Rouge",(0.9,0.05,0.03)), "cold":("M_Retour_Bleu",(0.03,0.25,0.95)),
 "fgas":("M_Frigo_Gaz",(0.6,0.2,0.85)), "fliq":("M_Frigo_Liquide",(0.2,0.85,0.8)),
 "ecs_h":("M_ECS_Chaude",(1.0,0.45,0.0)), "ecs_c":("M_ECS_Froide",(0.5,0.8,1.0)),
 "rad":("M_Radiateur",(0.95,0.95,0.95),0.4),
}.items()}

def link(o,c):
    for uc in o.users_collection: uc.objects.unlink(o)
    C[c].objects.link(o); return o
def box(name,c,lo,hi,m):
    lo,hi=Vector(lo),Vector(hi)
    bpy.ops.mesh.primitive_cube_add(size=1,location=(lo+hi)/2); o=bpy.context.object; o.name=name
    o.scale=hi-lo; bpy.ops.object.transform_apply(scale=True); o.data.materials.append(M[m]); return link(o,c)
def cyl(name,c,loc,r,depth,m,rot=(0,0,0),verts=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=r,depth=depth,location=loc,rotation=rot,vertices=verts)
    o=bpy.context.object; o.name=name; o.data.materials.append(M[m]); return link(o,c)
def pipe(name,c,pts,r,m):
    cu=bpy.data.curves.new(name,"CURVE"); cu.dimensions='3D'
    sp=cu.splines.new('POLY'); sp.points.add(len(pts)-1)
    for i,p in enumerate(pts): sp.points[i].co=(*p,1)
    cu.bevel_depth=r; cu.bevel_resolution=3; cu.use_fill_caps=True
    o=bpy.data.objects.new(name,cu); o.data.materials.append(M[m]); C[c].objects.link(o); return o
def empty(name,c,loc):
    o=bpy.data.objects.new(name,None); o.location=loc; o.empty_display_size=0.15; C[c].objects.link(o); return o

# ---------------- MAISON (plain-pied, coupe) ----------------
X0, X1, Y0, Y1, H = -1.30, 5.20, -1.20, 1.00, 2.50
# terrain facon maquette en coupe : jardin a -0.02, coupe de terre en facade (y=-1.2), pelouse avant a -0.30
box("Terrain_Jardin_Gauche","Exterieur",(-9.0,-1.20,-0.30),(-1.60,8.0,-0.02),"ground")
box("Terrain_Jardin_Arriere","Exterieur",(-1.60,1.20,-0.30),(14.0,8.0,-0.02),"ground")
box("Terrain_Jardin_Droite","Exterieur",(5.20,-1.20,-0.30),(14.0,1.20,-0.02),"ground")
box("Terrain_Coupe_Terre","Exterieur",(-9.0,-1.21,-0.30),(14.0,-1.20,-0.02),"soil")
box("Terrain_Avant","Exterieur",(-12.0,-12.0,-0.60),(16.0,-1.20,-0.30),"ground")
box("Gravier_PAC","Exterieur",(-3.2,-0.15,-0.02),(-1.70,1.0,0.01),"gravel")
# mur de facade multicouche, decoupe en escalier (coupe architecturale)
for nm,xa,xb,m in [("Facade_Enduit",-1.60,-1.58,"facade"),("Facade_Parpaing",-1.58,-1.38,"block"),
                   ("Facade_Isolant",-1.38,-1.32,"wallins"),("Facade_Placo",-1.32,-1.30,"plaster")]:
    box(nm+"_Haut","Maison",(xa,0.30,-0.30),(xb,1.20,H),m)
    box(nm+"_Bas","Maison",(xa,Y0,-0.30),(xb,0.30,0.35),m)
box("Mur_Fond","Maison",(X0,Y1,0.0),(X1,Y1+0.20,H),"plaster")
# plancher en couches : dalle / isolant / chape / carrelage
box("Sol_Dalle_Beton","Maison",(X0,Y0,-0.30),(X1,Y1,-0.13),"concrete")
box("Sol_Isolant","Maison",(X0,Y0,-0.13),(X1,Y1,-0.08),"floorins")
ZX0, ZX1 = 1.95, 5.05          # zone plancher chauffant decouverte
Y_CHAPE, Y_CARREL = -0.35, 0.10 # escalier de decoupe : tuyaux nus / chape / carrelage
box("Sol_Chape_Gauche","Maison",(X0,Y0,-0.08),(ZX0,Y1,-0.01),"screed")
box("Sol_Chape_Droite","Maison",(ZX1,Y0,-0.08),(X1,Y1,-0.01),"screed")
box("Sol_Chape_Zone","Maison",(ZX0,Y_CHAPE,-0.08),(ZX1,Y1,-0.01),"screed")
box("Sol_Carrelage_Gauche","Maison",(X0,Y0,-0.01),(ZX0,Y1,0.0),"tile")
box("Sol_Carrelage_Droite","Maison",(ZX1,Y0,-0.01),(X1,Y1,0.0),"tile")
box("Sol_Carrelage_Zone","Maison",(ZX0,Y_CARREL,-0.01),(ZX1,Y1,0.0),"tile")

# ---------------- GROUPE EXTERIEUR ----------------
ux,uy=-2.45,0.45
box("GE_Carrosserie","Exterieur",(ux-0.475,uy-0.185,0.07),(ux+0.475,uy+0.185,0.90),"casing")
for i,dx in enumerate((-0.38,0.38)):
    box(f"GE_Pied_{i}","Exterieur",(ux+dx-0.05,uy-0.2,0.01),(ux+dx+0.05,uy+0.2,0.07),"grille")
cyl("GE_Ventilateur_Grille","Exterieur",(ux-0.1,uy-0.19,0.48),0.3,0.02,"grille",rot=(math.pi/2,0,0),verts=48)
box("GE_Panneau_Raccords","Exterieur",(ux+0.475,uy-0.05,0.2),(ux+0.5,uy+0.15,0.55),"hydro")

# ---------------- MODULE INTERIEUR ALFEA DUO ----------------
mx0,mx1,my0,my1,mz=-0.80,-0.20,0.20,0.88,1.85; t=0.02
box("MI_Fond","Module",(mx0,my1-t,0),(mx1,my1,mz),"casing")
box("MI_Cote_G","Module",(mx0,my0,0),(mx0+t,my1,mz),"casing")
box("MI_Cote_D","Module",(mx1-t,my0,0),(mx1,my1,mz),"casing")
box("MI_Dessus","Module",(mx0,my0,mz-t),(mx1,my1,mz),"casing")
box("MI_Socle","Module",(mx0,my0,0),(mx1,my1,0.08),"casing")
box("MI_Separation","Module",(mx0+t,my0+0.02,1.36),(mx1-t,my1-t,1.38),"casing")
cx,cy=-0.5,0.54
bpy.ops.mesh.primitive_cylinder_add(radius=0.27,depth=1.22,location=(cx,cy,0.71),vertices=64)
tank=bpy.context.object; tank.name="MI_Ballon_180L"
bm=bmesh.new(); bm.from_mesh(tank.data)
bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(0,0,0),plane_no=(0,-1,0),clear_outer=True)
bm.to_mesh(tank.data); bm.free()
tank.modifiers.new("Epaisseur","SOLIDIFY").thickness=0.02; tank.data.materials.append(M["tank"]); link(tank,"Module")
turns,z0,z1,r=5.5,0.2,0.9,0.2; N=int(turns*48)
pipe("MI_Serpentin_ECS","Module",[(cx+r*math.cos(i/N*turns*2*math.pi),cy+r*math.sin(i/N*turns*2*math.pi),z1-(z1-z0)*i/N) for i in range(N+1)],0.011,"copper")
cyl("MI_Resistance_Appoint","Module",(cx,0.40,0.45),0.012,0.6,"resist")
box("MI_Echangeur_Condenseur","Module",(-0.74,0.50,1.42),(-0.62,0.62,1.78),"exch")
box("MI_V3V_Corps","Module",(-0.55,0.52,1.44),(-0.47,0.60,1.52),"brass")
cyl("MI_V3V_Moteur","Module",(-0.51,0.56,1.57),0.035,0.08,"hydro")
for i,x in enumerate((-0.40,-0.30)):
    cyl(f"MI_Circulateur_C{i+1}","Module",(x,0.50,1.62),0.045,0.07,"pump",rot=(math.pi/2,0,0))
    box(f"MI_Circulateur_C{i+1}_Corps","Module",(x-0.03,0.52,1.58),(x+0.03,0.60,1.66),"brass")
pipe("MI_Liaison_Echangeur_V3V","Module",[(-0.62,.56,1.48),(-0.55,.56,1.48)],0.01,"hot")
pipe("MI_Serpentin_Aller","Module",[(-0.30,.54,1.36),(-0.30,.54,0.90)],0.011,"hot")
pipe("MI_Serpentin_Retour","Module",[(-0.70,.54,0.20),(-0.50,.54,0.20),(-0.50,.54,1.36)],0.011,"cold")

# ---------------- FRIGO (2 liaisons) ----------------
# trace direct et visible : sortie GE -> traversee facade -> montee devant le mur -> flanc gauche du module
pipe("Frigo_Gaz","Frigo",[(-1.95,.56,.42),(-1.12,.56,.42),(-1.12,.56,1.67),(-0.74,.56,1.67)],0.024,"fgas")
pipe("Frigo_Liquide","Frigo",[(-1.95,.56,.28),(-1.00,.56,.28),(-1.00,.56,1.55),(-0.74,.56,1.55)],0.017,"fliq")

R=0.022
# ---------------- C1 -> SLOT_C1 (radiateur mural) ----------------
RX0,RX1,RZ0,RZ1=3.0,4.2,0.20,0.80
pipe("C1_Depart","Liaisons_C1",[(-0.70,.80,1.80),(-0.70,.80,2.25),(-0.70,.95,2.25),(2.93,.95,2.25),(2.93,.95,0.72),(2.93,.84,0.72),(RX0,.84,0.72)],R,"hot")
pipe("C1_Retour","Liaisons_C1",[(-0.61,.80,1.80),(-0.61,.80,2.15),(-0.61,.95,2.15),(2.85,.95,2.15),(2.85,.95,0.28),(2.85,.84,0.28),(RX0,.84,0.28)],R,"cold")
empty("SLOT_C1_Raccord","SLOT_C1",(RX0,.84,0.5))
box("C1_Radiateur_Corps","SLOT_C1",(RX0,.80,RZ0),(RX1,.90,RZ1),"rad")
for i in range(int((RX1-RX0)/0.08)):
    x=RX0+0.03+i*0.08; box(f"C1_Radiateur_Ailette_{i:02d}","SLOT_C1",(x,.785,RZ0+0.02),(x+0.04,.80,RZ1-0.02),"rad")

# ---------------- C2 -> SLOT_C2 (collecteur + plancher chauffant) ----------------
ECS_X=-0.32
pipe("C2_Depart","Liaisons_C2",[(-0.52,.80,1.80),(-0.52,.80,2.05),(-0.52,.95,2.05),(1.32,.95,2.05),(1.32,.95,0.60)],R,"hot")
pipe("C2_Retour","Liaisons_C2",[(-0.43,.80,1.80),(-0.43,.80,1.95),(-0.43,.95,1.95),(1.20,.95,1.95),(1.20,.95,0.35)],R,"cold")
empty("SLOT_C2_Raccord","SLOT_C2",(1.5,.95,0.48))
pipe("C2_Collecteur_Depart","SLOT_C2",[(1.32,.95,0.60),(1.92,.95,0.60)],0.028,"brass")
pipe("C2_Collecteur_Retour","SLOT_C2",[(1.20,.95,0.35),(1.92,.95,0.35)],0.028,"brass")
def spiral(L,R_,B,T,step):
    pts=[(L,T)]
    while (R_-L)>step and (T-B)>step:
        pts+=[(R_,T),(R_,B),(L,B)]; T2=T-step
        if T2-B<=step*0.5: break
        pts.append((L,T2)); L,R_,B,T=L+step,R_-step,B+step,T2
    return pts
s,rl,zf=0.12,0.012,-0.065
def boucle(tag,x0,x1,y0,y1,feed_dep,feed_ret):
    red=spiral(x0,x1,y0,y1,2*s); blue=spiral(x0+s,x1-s,y0+s,y1-s,2*s)
    pipe(f"C2_Boucle_{tag}_Aller","SLOT_C2",feed_dep+[(x,y,zf) for x,y in red],rl,"hot")
    pipe(f"C2_Boucle_{tag}_Retour","SLOT_C2",[(x,y,zf) for x,y in blue[::-1]]+feed_ret,rl,"cold")
    pipe(f"C2_Boucle_{tag}_Centre","SLOT_C2",[(*red[-1],zf),(*blue[-1],zf)],rl,"cold")
boucle("A",2.05,3.45,-1.10,0.45,
   [(1.60,.95,.6),(1.60,.80,.6),(1.60,.80,zf),(1.60,.45,zf)],
   [(1.52,.33,zf),(1.52,.70,zf),(1.52,.70,.35),(1.52,.95,.35)])
boucle("B",3.55,4.95,-1.10,0.45,
   [(1.85,.95,.6),(1.85,.80,.6),(1.85,.80,zf),(3.55,.80,zf),(3.55,.45,zf)],
   [(3.67,.33,zf),(3.50,.33,zf),(3.50,.70,zf),(1.78,.70,zf),(1.78,.70,.35),(1.78,.95,.35)])

# ---------------- CAMERA / LUMIERE ----------------
camd=bpy.data.cameras.new("Camera_Synoptique"); camd.lens=20
cam=bpy.data.objects.new("Camera_Synoptique",camd); scn.collection.objects.link(cam)
cam.location=(0.55,-4.9,2.0); tgt=Vector((0.65,0.4,0.85))
cam.rotation_euler=(tgt-cam.location).to_track_quat('-Z','Y').to_euler(); scn.camera=cam
scn.render.resolution_x,scn.render.resolution_y=1920,1080
sund=bpy.data.lights.new("Soleil","SUN"); sund.energy=3
sun=bpy.data.objects.new("Soleil",sund); scn.collection.objects.link(sun)
sun.rotation_euler=(math.radians(50),0,math.radians(-30))
