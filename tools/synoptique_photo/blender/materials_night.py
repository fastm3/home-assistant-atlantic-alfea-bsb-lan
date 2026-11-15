
# Materiaux photorealistes procéduraux + eclairage nuit + etats chauffe/arret
import bpy, math
from mathutils import Vector
scn = bpy.context.scene

def reset(m):
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (600,0)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.location = (300,0)
    nt.links.new(b.outputs[0], out.inputs["Surface"]); return nt, b
def N(nt, t, loc=(0,0), **props):
    n = nt.nodes.new(t); n.location = loc
    for k,v in props.items(): setattr(n,k,v)
    return n
def coords(nt):
    tc = N(nt,"ShaderNodeTexCoord",(-900,0)); return tc.outputs["Object"]
def bump(nt, b, height_socket, strength=0.2, dist=0.01):
    bp = N(nt,"ShaderNodeBump",(100,-300)); bp.inputs["Strength"].default_value=strength
    bp.inputs["Distance"].default_value=dist
    nt.links.new(height_socket, bp.inputs["Height"]); nt.links.new(bp.outputs[0], b.inputs["Normal"])
def noise_color(nt, b, c1, c2, scale=8, detail=6, rough=(0.6,0.8), bump_s=0.15):
    co = coords(nt)
    nz = N(nt,"ShaderNodeTexNoise",(-600,0)); nz.inputs["Scale"].default_value=scale; nz.inputs["Detail"].default_value=detail
    nt.links.new(co, nz.inputs["Vector"])
    cr = N(nt,"ShaderNodeValToRGB",(-300,100)); cr.color_ramp.elements[0].color=(*c1,1); cr.color_ramp.elements[1].color=(*c2,1)
    nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"]); nt.links.new(cr.outputs[0], b.inputs["Base Color"])
    rr = N(nt,"ShaderNodeMapRange",(-300,-150)); rr.inputs["To Min"].default_value=rough[0]; rr.inputs["To Max"].default_value=rough[1]
    nt.links.new(nz.outputs["Fac"], rr.inputs["Value"]); nt.links.new(rr.outputs[0], b.inputs["Roughness"])
    bump(nt,b,nz.outputs["Fac"],bump_s)
def mat(name): return bpy.data.materials.get(name)

# --- carrelage 60x60 gres beige, joints gris ---
nt,b = reset(mat("M_Carrelage")); co = coords(nt)
br = N(nt,"ShaderNodeTexBrick",(-600,0), offset=0.0, squash=1.0)
br.inputs["Brick Width"].default_value=0.6; br.inputs["Row Height"].default_value=0.6
br.inputs["Mortar Size"].default_value=0.004; br.inputs["Scale"].default_value=1.0
br.inputs["Color1"].default_value=(0.78,0.74,0.67,1); br.inputs["Color2"].default_value=(0.72,0.68,0.61,1)
br.inputs["Mortar"].default_value=(0.35,0.34,0.32,1)
nt.links.new(co, br.inputs["Vector"]); nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
mr = N(nt,"ShaderNodeMapRange",(-300,-200)); mr.inputs["To Min"].default_value=0.12; mr.inputs["To Max"].default_value=0.7
nt.links.new(br.outputs["Fac"], mr.inputs["Value"]); nt.links.new(mr.outputs[0], b.inputs["Roughness"])
inv = N(nt,"ShaderNodeMath",(-300,-400), operation='SUBTRACT'); inv.inputs[0].default_value=1.0
nt.links.new(br.outputs["Fac"], inv.inputs[1]); bump(nt,b,inv.outputs[0],0.4,0.004)
b.inputs["Coat Weight"].default_value=0.3

noise_color(*reset(mat("M_Chape")), (0.55,0.52,0.47),(0.66,0.63,0.57), scale=14, rough=(0.8,0.95), bump_s=0.3)
noise_color(*reset(mat("M_Dalle_Beton")), (0.32,0.32,0.33),(0.47,0.47,0.48), scale=10, rough=(0.75,0.95), bump_s=0.35)
noise_color(*reset(mat("M_Isolant_Sol")), (0.55,0.62,0.70),(0.68,0.75,0.82), scale=40, rough=(0.85,1.0), bump_s=0.25)
noise_color(*reset(mat("M_Enduit_Interieur")), (0.74,0.72,0.68),(0.82,0.80,0.76), scale=25, rough=(0.8,0.9), bump_s=0.05)
noise_color(*reset(mat("M_Enduit_Facade")), (0.55,0.53,0.50),(0.66,0.64,0.60), scale=60, rough=(0.85,1.0), bump_s=0.3)
noise_color(*reset(mat("M_Parpaing")), (0.35,0.35,0.34),(0.50,0.49,0.47), scale=30, rough=(0.85,1.0), bump_s=0.4)
noise_color(*reset(mat("M_Isolant_Mur")), (0.75,0.68,0.40),(0.88,0.80,0.52), scale=50, rough=(0.9,1.0), bump_s=0.5)
noise_color(*reset(mat("M_Gazon")), (0.04,0.09,0.02),(0.10,0.20,0.05), scale=60, detail=10, rough=(0.7,0.95), bump_s=0.6)
noise_color(*reset(mat("M_Terre")), (0.12,0.08,0.05),(0.22,0.15,0.10), scale=20, rough=(0.9,1.0), bump_s=0.5)
# gravier : voronoi
nt,b = reset(mat("M_Gravier")); co = coords(nt)
vo = N(nt,"ShaderNodeTexVoronoi",(-600,0)); vo.inputs["Scale"].default_value=60; nt.links.new(co, vo.inputs["Vector"])
cr = N(nt,"ShaderNodeValToRGB",(-300,100)); cr.color_ramp.elements[0].color=(0.25,0.24,0.22,1); cr.color_ramp.elements[1].color=(0.62,0.60,0.56,1)
nt.links.new(vo.outputs["Color"], cr.inputs["Fac"]); nt.links.new(cr.outputs[0], b.inputs["Base Color"])
b.inputs["Roughness"].default_value=0.85; bump(nt,b,vo.outputs["Distance"],0.6,0.02)

def simple(name, rgb, rough, metal=0.0, aniso=0.0, coat=0.0):
    nt,b = reset(mat(name)); b.inputs["Base Color"].default_value=(*rgb,1)
    b.inputs["Roughness"].default_value=rough; b.inputs["Metallic"].default_value=metal
    b.inputs["Anisotropic"].default_value=aniso; b.inputs["Coat Weight"].default_value=coat; return nt,b
simple("M_Carrosserie",(0.85,0.86,0.87),0.3,coat=0.4)
simple("M_Grille",(0.02,0.02,0.025),0.5)
simple("M_Cuve",(0.75,0.76,0.78),0.28,1.0,aniso=0.6)
simple("M_Laiton",(0.80,0.62,0.30),0.25,1.0)
simple("M_BlocHydro",(0.12,0.13,0.15),0.4)
simple("M_Circulateur",(0.05,0.18,0.45),0.35,coat=0.5)
simple("M_Echangeur",(0.70,0.72,0.75),0.3,1.0)
simple("M_Radiateur",(0.90,0.90,0.89),0.25,coat=0.6)

# --- materiaux "flux" : couleur + emission pilotee par l'etat ---
FLUX = {  # nom : (couleur, emission chauffe)
 "M_Depart_Rouge": ((0.85,0.06,0.02), 1.6),
 "M_Retour_Bleu":  ((0.02,0.20,0.90), 1.3),
 "M_Frigo_Gaz":    ((0.55,0.15,0.85), 1.0),
 "M_Frigo_Liquide":((0.10,0.80,0.75), 0.8),
 "M_Cuivre":       ((0.95,0.45,0.18), 1.2),
 "M_Resistance":   ((1.0,0.55,0.10), 0.0),
}
for name,(rgb,_) in FLUX.items():
    nt,b = simple(name, rgb, 0.25, 1.0 if name=="M_Cuivre" else 0.0, coat=0.8)
    b.inputs["Emission Color"].default_value=(*rgb,1)

def set_state(state="chauffe"):
    on = state=="chauffe"
    for name,(rgb,em) in FLUX.items():
        b = next(n for n in mat(name).node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        b.inputs["Emission Strength"].default_value = em if on else 0.0
    glow = bpy.data.objects.get("FX_Souffle_Ventilateur")
    if glow: glow.hide_render = not on
    print("etat:", state)

# --- FX souffle froid devant le ventilateur du groupe exterieur ---
fx = bpy.data.objects.get("FX_Souffle_Ventilateur")
if fx is None:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.33, depth=0.6, location=(-2.55,0.26-0.3,0.48), rotation=(math.pi/2,0,0), vertices=48)
    fx = bpy.context.object; fx.name="FX_Souffle_Ventilateur"
    for uc in fx.users_collection: uc.objects.unlink(fx)
    bpy.data.collections["Exterieur"].objects.link(fx)
    m = bpy.data.materials.new("M_FX_Souffle"); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear()
    out=N(nt,"ShaderNodeOutputMaterial",(600,0)); vol=N(nt,"ShaderNodeVolumePrincipled",(300,0))
    vol.inputs["Density"].default_value=0.0; vol.inputs["Emission Color"].default_value=(0.2,0.55,1.0,1)
    vol.inputs["Emission Strength"].default_value=0.25
    nt.links.new(vol.outputs[0], out.inputs["Volume"]); fx.data.materials.append(m)

# --- ECLAIRAGE NUIT ---
for o in list(bpy.data.objects):
    if o.type=='LIGHT': bpy.data.objects.remove(o, do_unlink=True)
w = scn.world or bpy.data.worlds.new("World"); scn.world = w; w.use_nodes=True; nt=w.node_tree; nt.nodes.clear()
out=N(nt,"ShaderNodeOutputWorld",(600,0)); bg=N(nt,"ShaderNodeBackground",(300,0))
sky=N(nt,"ShaderNodeValToRGB",(0,0)); sky.color_ramp.elements[0].color=(0.004,0.006,0.015,1); sky.color_ramp.elements[1].color=(0.02,0.04,0.09,1)
tc=N(nt,"ShaderNodeTexCoord",(-600,0)); sep=N(nt,"ShaderNodeSeparateXYZ",(-400,0))
nt.links.new(tc.outputs["Generated"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], sky.inputs["Fac"])
nt.links.new(sky.outputs[0], bg.inputs["Color"]); bg.inputs["Strength"].default_value=1.0
nt.links.new(bg.outputs[0], out.inputs["Surface"])

def light(name, kind, loc, energy, color, rot=(0,0,0), size=None, size_y=None, spot=None):
    ld = bpy.data.lights.new(name, kind); ld.energy=energy; ld.color=color
    if size is not None:
        if kind=='AREA': ld.shape='RECTANGLE'; ld.size=size; ld.size_y=size_y or size
        else: ld.shadow_soft_size=size
    if spot: ld.spot_size=math.radians(spot); ld.spot_blend=0.6
    o = bpy.data.objects.new(name, ld); o.location=loc; o.rotation_euler=rot; scn.collection.objects.link(o); return o
WARM=(1.0,0.72,0.45); MOON=(0.55,0.65,1.0)
light("Lune","SUN",(0,0,10),0.25,MOON,rot=(math.radians(55),0,math.radians(-40)),size=0.02)
light("Plafonnier_Piece","AREA",(1.8,0.0,2.45),70,WARM,size=4.5,size_y=1.6)
light("Spot_Module","SPOT",(-0.2,-1.2,2.45),45,WARM,rot=(math.radians(35),0,0),size=0.05,spot=50)
light("Spot_Radiateur","SPOT",(3.6,-0.6,2.45),25,WARM,rot=(math.radians(30),0,0),size=0.05,spot=55)
light("Applique_Facade","POINT",(-1.75,-0.4,1.9),25,WARM,size=0.08)
light("Fill_Face","AREA",(0.8,-5.0,0.6),25,MOON,rot=(math.radians(90),0,0),size=6,size_y=1.5)
light("Contre_Jour_Jardin","AREA",(-4.0,2.5,2.5),80,MOON,rot=(math.radians(-60),0,math.radians(180)),size=3)

# --- RENDU ---
scn.render.engine='CYCLES'
cp = bpy.context.preferences.addons['cycles'].preferences
try:
    cp.compute_device_type='HIP'; cp.get_devices()
    for d in cp.devices: d.use = True
    scn.cycles.device='GPU'
except Exception as e: print("GPU off:", e); scn.cycles.device='CPU'
scn.cycles.samples=128; scn.cycles.use_denoising=True; scn.cycles.use_adaptive_sampling=True
scn.view_settings.view_transform='AgX'
try: scn.view_settings.look='AgX - Medium High Contrast'
except Exception: pass
scn.view_settings.exposure=0.0

# --- glow (compositeur) ---
try:
    ng = bpy.data.node_groups.get("Compo_Glow") or bpy.data.node_groups.new("Compo_Glow","CompositorNodeTree")
    ng.nodes.clear()
    if not ng.interface.items_tree: ng.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
    rl = ng.nodes.new("CompositorNodeRLayers"); gl = ng.nodes.new("CompositorNodeGlare"); go = ng.nodes.new("NodeGroupOutput")
    if 'Type' in gl.inputs:
        try: gl.inputs['Type'].default_value='Bloom'
        except Exception as e: print('type', e)
    for k,v in (("Threshold",1.0),("Strength",0.6),("Size",0.6)):
        if k in gl.inputs: gl.inputs[k].default_value=v
    ng.links.new(rl.outputs["Image"], gl.inputs["Image"]); ng.links.new(gl.outputs["Image"], go.inputs[0])
    scn.compositing_node_group = ng
    print("glow ok")
except Exception as e: print("glow skip:", e)
