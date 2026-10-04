/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var FrogMage = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

FrogMage.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: FrogMage
});

FrogMage.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 10;
    this.monster.basicAttackPotency = 100;

    this.renewPotency = 200;
    this.healEverySeconds = 6;
    this.timeSinceHeal = 0;
    this.decurseEverySeconds = 6;
    this.timeSinceDecurse = 0;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceHeal += args.delta;
        othis.timeSinceDecurse += args.delta;

        var didHeal = false;
        var didDecurse = false;

        if(othis.timeSinceDecurse > othis.decurseEverySeconds) {
             _.each(othis.monster.nearbyMonsters(30, 11), function(targetMonster) {
                if(didDecurse) return;
                if(targetMonster.gameObject.getComponent("NpcFollowPath")) return;
                if(targetMonster.hasDebuff()) {
                    didDecurse = true;
                    othis.timeSinceDecurse = 0;
                    args.takeOpportunity();
                    othis.decurseAlly(targetMonster);
                    args.finishOpportunity();
                }
             });
        }

        if(!didDecurse && othis.timeSinceHeal > othis.healEverySeconds) {

            //Look for nearby allies who are low on health.
            _.each(othis.monster.nearbyMonsters(30, 11), function(targetMonster) {
                if(didHeal) return;
                if(targetMonster.gameObject.getComponent("NpcFollowPath")) return;
                if(targetMonster.getSyncedVar("maxHitPoints") - targetMonster.getSyncedVar("hitPoints") > -1 * othis.monster.potencyHealing(othis.renewPotency)) {
                    othis.healAlly(targetMonster);
                    didHeal = true;
                    othis.timeSinceHeal = 0;
                    args.takeOpportunity();
                    args.finishOpportunity();
                }
            });

        }
    });
}

FrogMage.prototype.healAlly = function(targetMonster) {
    //console.log("HEALING ALLY: " + healTarget.name);
    var targetEntity = targetMonster.gameObject.entity;
    if(targetEntity == null) {
        console.log("ERROR: Unable to find an entity for my heal target...");
        return;
    }

    var othis = this;

    othis.broadcastToActiveClients(1, ["ushort", "byte"], [targetEntity.guid, 1]);

    targetMonster.addStatusEffect(StatusEffects.Effects.Renew, 10, {tickDmg: othis.monster.potencyHealing(othis.renewPotency), sourceEntity: othis.gameObject.entity});
    //healTarget.triggerEvent("TakeDamage", {dmgAmount: this.monster.potencyHealing(this.healPotency), sender: this.gameObject.entity, dmgType: "magical"});
}

FrogMage.prototype.decurseAlly = function(targetMonster) {
    console.log("DECURSE " + targetMonster.gameObject.name);
    var targetEntity = targetMonster.gameObject.entity;
    if(targetEntity == null) {
        console.log("ERROR: Unable to find an entity for my heal target...");
        return;
    }
    targetMonster.removeFirstEffect("debuff");
    this.broadcastToActiveClients(1, ["ushort", "byte"], [targetEntity.guid, 2]);
}


module.exports = FrogMage;