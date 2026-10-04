var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var EliteCactus = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

EliteCactus.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: EliteCactus
});

EliteCactus.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 4;
    this.monster.lootTier = 4;
    if(this.gameObject.zone.zoneInfo.safetyLevel < 0.5 && this.gameObject.zone.zoneInfo.isOverworld) {
        this.monster.allowEpicDrop = true;
    }

    this.needlePotency = 500;
    this.needleEveryAttacks = 3;
    this.timeSinceNeedle = 0;
    this.doBreathNextMove = false;

    this.breathSize = new Vector3(4, 4, 10);
    this.breathForwardOffset = 1.4; //how far forward to shift the breath from the center of the monster to the front.
    this.breathCastTime = 2.0;
    this.breathPotency = 1000;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceNeedle++;

        if(othis.doBreathNextMove) {
            othis.doBreathNextMove = false;
            args.takeOpportunity();
            othis.breathAttack(args.finishOpportunity);
        }

        else if(othis.timeSinceNeedle > othis.needleEveryAttacks) {

            if(args.takeOpportunity()) {

                othis.timeSinceNeedle = 0;

                //Needle everyting on my aggro table.
                var aggroTable = othis.monster.getSortedAggroTable();
                var targetNum = 0;
                _.each(aggroTable, function(aTargetEntity) {
                    setTimeout(function() {
                        othis.needleTarget(aTargetEntity);
                    }, 500 * targetNum);
                    targetNum++;
                });

                othis.doBreathNextMove = true;

                targetNum++;

                setTimeout(function() {
                    args.finishOpportunity();
                }, 500 * targetNum)
                

            }
        }
    });
}

EliteCactus.prototype.needleTarget = function(anEntity) {
    if(!anEntity || !anEntity.targetGo) return;
    var targetPos = anEntity.targetGo.getWorldPosition();
    this.monster.turnToward(targetPos);
    this.monster.dealMeleeDamage(anEntity.targetGo, {dmgAmount: this.monster.potencyDamage(this.needlePotency), dmgType: "physical"});
    this.broadcastToActiveClients(1, ["ushort"], [anEntity.entity.guid]);
}

EliteCactus.prototype.breathAttack = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset + this.breathSize.z * 0.5).add(this.gameObject.transform.position);
    breathCenter.y += this.breathSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.dangerZone("directional", "box", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
        console.log("CACTUS ELITE HIT " + objectsHit.length + " ENEMIES");
        console.log(othis.monster.currentStats.attack);
        console.log(othis.breathPotency);
        console.log("DOING " + othis.monster.potencyDamage(othis.breathPotency) + " DAMAGE");
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        setTimeout(function() {
            finishCallback();
        }, 1000); //give time for breath attack to finish.
        
    });
};


module.exports = EliteCactus;