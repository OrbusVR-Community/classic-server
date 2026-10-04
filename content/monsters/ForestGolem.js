var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var ForestGolem = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

ForestGolem.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: ForestGolem
});

ForestGolem.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 10;
    this.monster.basicAttackPotency = 100;
    this.monster.basicAttackDelay = 1;

    this.healPotency = 600;
    this.healEverySeconds = 6;
    this.timeSinceHeal = 0;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceHeal += args.delta;

        if(othis.timeSinceHeal < othis.healEverySeconds) return;

        //Look for nearby allies who are low on health.
        var didHeal = false;
        _.each(othis.monster.nearbyMonsters(30, 11), function(targetMonster) {
            if(didHeal) return;
            if(targetMonster.getSyncedVar("maxHitPoints") - targetMonster.getSyncedVar("hitPoints") > -1 * othis.monster.potencyHealing(othis.healPotency)) {
                othis.healAlly(targetMonster.gameObject);
                didHeal = true;
                othis.timeSinceHeal = 0;
                args.takeOpportunity();
                setTimeout(function() {
                    args.finishOpportunity();
                }, 1000);
            }
        });
    });
}

ForestGolem.prototype.healAlly = function(/*GameObject*/ healTarget) {
    //console.log("HEALING ALLY: " + healTarget.name);
    var targetEntity = healTarget.entity;
    if(targetEntity == null) {
        console.log("ERROR: Unable to find an entity for my heal target...");
        return;
    }

    var othis = this;
    this.monster.triggerAnimation("heal");
    this.monster.interruptibleAttack(1.5, function() {
        othis.broadcastToActiveClients(1, ["ushort"], [targetEntity.guid]);
        healTarget.triggerEvent("TakeDamage", {dmgAmount: othis.monster.potencyHealing(othis.healPotency), sender: othis.gameObject.entity, dmgType: "magical"});
    });
}


module.exports = ForestGolem;