/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var MagicWolf = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

MagicWolf.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: MagicWolf
});

MagicWolf.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 30;

    this.healPotency = 1200;

    this.healEvery = 3;
    this.movesSinceHeal = 0;

    this.isMagic = true;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        if(!othis.isMagic) return;

        args.takeOpportunity();
        setTimeout(function() {
            args.finishOpportunity();
        }, 500);

        othis.movesSinceHeal++;

        if(othis.movesSinceHeal > othis.healEvery) {
            othis.movesSinceHeal = 0;
            othis.findAllyToHeal();
        }
    });

    this.gameObject.addEventListener("PacifyMagic", function() {
        othis.isMagic = false;
        othis.monster.trackingDistance = 4;
    });
}

MagicWolf.prototype.findAllyToHeal = function() {
    var othis = this;
    var didHeal = false;
    //Look for nearby allies who are low on health.
    _.each(othis.monster.nearbyMonsters(60, 11), function(targetMonster) {
        if(didHeal) return;
        if((targetMonster.getSyncedVar("hitPoints") / targetMonster.getSyncedVar("maxHitPoints")) < 0.75) {
            othis.healAlly(targetMonster);
            didHeal = true;
        }
    });
}

MagicWolf.prototype.healAlly = function(targetMonster) {
    //console.log("HEALING ALLY: " + healTarget.name);
    if(!targetMonster) {
        console.log("NOTHING TO HEAL?");
        return;
    }
    console.log("HEALING ALLY: " + targetMonster.getSyncedVar("monsterName"));
    var othis = this;
    var targetEntity = targetMonster.gameObject.entity;
    if(targetEntity == null) {
        console.log("ERROR: Unable to find an entity for my heal target...");
        return;
    }

    this.monster.triggerAnimation("howl");

    this.monster.interruptibleAttack(1.5, function() {
        othis.broadcastToActiveClients(1, ["ushort", "byte"], [targetEntity.guid, 1]);
        //targetMonster.addStatusEffect(StatusEffects.Effects.Renew, 12, {tickDmg: this.monster.potencyHealing(this.renewPotency), sourceEntity: this.gameObject.entity});
        targetMonster.gameObject.triggerEvent("TakeDamage", {dmgAmount: othis.monster.potencyHealing(othis.healPotency), sender: othis.gameObject.entity, dmgType: "magical"});
    });

    
}

module.exports = MagicWolf;
