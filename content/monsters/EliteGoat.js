/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var Euler = require("three").Euler;
var StatusEffects = require("orbus").StatusEffects;

var EliteGoat = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

EliteGoat.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: EliteGoat
});

EliteGoat.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.lootTier = 4;
    if(this.gameObject.zone.zoneInfo.safetyLevel < 0.5 && this.gameObject.zone.zoneInfo.isOverworld) {
        this.monster.allowEpicDrop = true;
    }

    this.timeSinceDrop = 0;
    this.dropEvery = 3;
    this.dashPotency = 400;

    this.timeSinceSlash = 0;
    this.slashEvery = 5;
    this.slashPotency = 900;

    this.poisonPotency = 100;
    
    this.LinechargeSize = new Vector3(3, 4, 25);
    this.LinechargeForwardOffset = 0.5; //how far forward to shift the breath from the center of the monster to the front.
    this.LinechargeCastTime = 1.5;
    this.LinechargePotency = 800;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceDrop++;
        othis.timeSinceSlash++;

        if(othis.timeSinceDrop > othis.dropEvery) {
            othis.timeSinceDrop = 0;
            args.takeOpportunity();
            setTimeout(function() {
                args.finishOpportunity();
            }, 500);
            
            othis.doDrop();
            return;
        }

        if(othis.timeSinceSlash > othis.slashEvery) {
            othis.timeSinceSlash = 0;
            args.takeOpportunity();
            othis.doSlash(args);
            return;
        }
    })
};

EliteGoat.prototype.doSlash = function(args) {

    var currentRotation = new Euler(this.gameObject.transform.rotation.x, this.gameObject.transform.rotation.y, this.gameObject.transform.rotation.z, this.gameObject.transform.rotation.order);

    //1.5708 radians = 90 degrees

    for(var i=1; i < 4; i++) {
        this.gameObject.transform.setNewEuler(new Euler(currentRotation.x, currentRotation.y + 1.5708 * i, currentRotation.z, currentRotation.order));
        this.gameObject.transform.updateMatrixWorld();
        this.lineAttack();
    }

    this.gameObject.transform.setNewEuler(currentRotation);
    this.gameObject.transform.updateMatrixWorld();
    this.lineAttack();

    setTimeout(function() {
        args.finishOpportunity();
    }, 2500);
}

EliteGoat.prototype.lineAttack = function() {
    var othis = this;
    console.log("AOE ATTACK");
    var LinechargeCenter = this.gameObject.forward().multiplyScalar(this.LinechargeForwardOffset + this.LinechargeSize.z * 0.5).add(this.gameObject.transform.position);
    LinechargeCenter.y += this.LinechargeSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [LinechargeCenter, this.LinechargeSize, this.LinechargeCastTime]);
    this.monster.dangerZone("directional", "box", LinechargeCenter, this.LinechargeSize, this.LinechargeCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.LinechargePotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
    });
};

EliteGoat.prototype.doDrop = function() {
    //Choose someone at random we're not already attacking. Dash to them, do damage, then dash back.
    var othis = this;
    var aggroTable = this.monster.getSortedAggroTable();
    if(aggroTable.length < 2) return;
    var target = aggroTable[1];

    this.broadcastToActiveClients(1, ["ushort"], [target.entity.guid]);
    setTimeout(function() {
        if(target && target.targetGo && othis.monster) {
            othis.monster.dealMeleeDamage(target.targetGo, {dmgAmount: othis.monster.potencyDamage(othis.dashPotency), dmgType: "physical"});
            var targetMonster = target.targetGo.getComponent("Monster");
            if(targetMonster) {
                targetMonster.addStatusEffect(StatusEffects.Effects.Poison, 5, {sourceEntity: othis.gameObject.entity, tickDmg: othis.monster.potencyDamage(othis.poisonPotency)});
                targetMonster.addStatusEffect(StatusEffects.Effects.Hamstring, 5, {slowPercentage: -0.50, sourceEntity: othis.gameObject.entity});
            }
        }
    }, 500);
}


module.exports = EliteGoat;
