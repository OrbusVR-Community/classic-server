/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var EliteTentacle = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

EliteTentacle.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: EliteTentacle
});

EliteTentacle.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 4.0;
    this.monster.setMovementSpeed(6.5);
    this.monster.lootTier = 4;
    if(this.gameObject.zone.zoneInfo.safetyLevel < 0.5 && this.gameObject.zone.zoneInfo.isOverworld) {
        this.monster.allowEpicDrop = true;
    }

    this.grabberEverySeconds = 40;
    this.timeSinceGrabber = 20;

    this.projectilePotency = 700;

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        othis.timeSinceGrabber += args.delta;

        if(othis.timeSinceGrabber > othis.grabberEverySeconds && othis.monster.trackingTarget) {
            othis.timeSinceGrabber = 0;
            othis.doGrabber();
        }
    });
}

EliteTentacle.prototype.doGrabber = function() {
    var othis = this;

    console.log("DOING GRABBER MOVE");

    this.monster.triggerAnimation("spellcast");

    var currentAggroTable = this.monster.getSortedAggroTable();
    _.each(currentAggroTable, function(aggroEntry) {
        var targetMonster = aggroEntry.targetGo.getComponent("Monster");
        if(targetMonster) {
            //Grab them, and spawn in a projectile and send it slowly towards them.
            var targetPos = targetMonster.gameObject.getWorldPosition();
            var newent = othis.gameObject.zone.spawnEntity("ThornGrabber", targetPos);
            var grabberComponent = newent.gameObject.getComponent("ThornGrabber");
            grabberComponent.Setup(targetMonster);
            var mypos = othis.gameObject.getWorldPosition();
            var newprojectile = othis.gameObject.zone.spawnEntity("EliteTentacleProjectile", new Vector3(mypos.x, targetPos.y, mypos.z));
            var projectileComponent = newprojectile.gameObject.getComponent("SlowMovingProjectile");
            projectileComponent.finalPosition = targetPos;
            projectileComponent.dmgAmount = othis.monster.potencyDamage(othis.projectilePotency);
            projectileComponent.firingEntity = othis.gameObject.entity;
        }
    });
}


module.exports = EliteTentacle;
