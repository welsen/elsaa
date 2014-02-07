var md5 = require("crypto-js/md5");

var Acl = (function () {
    'use strict';

    function Acl(db) {
        this.DB = db;
    }

    Acl.prototype.AddRole = function (name, desc, parent, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("INSERT INTO ACL_ROLES(NAME, DESCRIPTION, PARENT, CREATED, MODIFIED, ACTIVE) VALUES(:name, :desc, :parent, :now, :now, 1)", {
            ':name': name,
            ':desc': desc,
            ':parent': parent,
            ':now': now
        }, function (error) {
            if (error == null) {
                callback();
            } else {
                console.log(error);
            }
        });
    };

    Acl.prototype.UpdateRole = function (id, desc, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("UPDATE ACL_ROLES SET DESCRIPTION=:desc, MODIFIED=:now WHERE ID=:id", {
            ':id': id,
            ':desc': desc,
            ':now': now
        }, function (error) {
            if (error == null) {
                callback();
            } else {
                console.log(error);
            }
        });
    };

    Acl.prototype.DeleteRole = function (id, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("UPDATE ACL_ROLES SET ACTIVE=0, MODIFIED=:now WHERE ID=:id AND DELETABLE=1", {
            ':id': id,
            ':now': now
        }, function (error) {
            if (error == null) {
                if (this.changes != 0) {
                    self.DB.run("UPDATE ACL_ROLES SET PARENT=0, MODIFIED=:now WHERE PARENT=:id", {
                        ':id': id,
                        ':now': now
                    }, function (error) {
                        if (error == null) {
                            callback();
                        } else {
                            console.log(error);
                        }
                    });
                }
            } else {
                console.log(error);
            }
        });
    };

    Acl.prototype.GetRolesUnder = function (id, callback) {
        var self = this;

        self.DB.all("WITH RECURSIVE\
                UNDER_ROLE(NAME,PARENT,DESCRIPTION,ID) AS (\
                    SELECT '' AS NAME, :id AS PARENT, '' AS DESCRIPTION, 0 AS ID\
                    UNION ALL\
                    SELECT ACL_ROLES.NAME, UNDER_ROLE.PARENT + 1, ACL_ROLES.DESCRIPTION, ACL_ROLES.ID\
                        FROM ACL_ROLES JOIN UNDER_ROLE ON ACL_ROLES.PARENT=UNDER_ROLE.PARENT\
                        WHERE ACL_ROLES.ACTIVE = 1\
                        ORDER BY 2\
                )\
            SELECT ID, NAME, PARENT, DESCRIPTION FROM UNDER_ROLE;", {
            ':id': id
        }, function (error, rows) {
            if (error == null) {
                callback(rows);
            } else {
                console.log(error);
            }
        });
    };

    Acl.prototype.AddPermission = function (name, desc, parent, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("INSERT INTO ACL_PERMISSIONS(NAME, DESCRIPTION, PARENT, CREATED, MODIFIED, ACTIVE) VALUES(:name, :desc, :parent, :now, :now, 1)", {
            ':name': name,
            ':desc': desc,
            ':parent': parent,
            ':now': now
        }, function (error) {
            if (error == null) {
                callback();
            } else {
                console.log(error);
            }
        });
    };

    Acl.prototype.UpdatePermission = function (id, desc, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("UPDATE ACL_PERMISSIONS SET DESCRIPTION=:desc, MODIFIED=:now WHERE ID=:id", {
            ':id': id,
            ':desc': desc,
            ':now': now
        }, function (error) {
            if (error == null) {
                callback();
            } else {
                console.log(error);
            }
        });
    };

    Acl.prototype.DeletePermission = function (id, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("UPDATE ACL_PERMISSIONS SET ACTIVE=0, MODIFIED=:now WHERE ID=:id", {
            ':id': id,
            ':now': now
        }, function (error) {
            if (error == null) {
                if (this.changes != 0) {
                    self.DB.run("UPDATE ACL_PERMISSIONS SET PARENT=0, MODIFIED=:now WHERE PARENT=:id", {
                        ':id': id,
                        ':now': now
                    }, function (error) {
                        if (error == null) {
                            callback();
                        } else {
                            console.log(error);
                        }
                    });
                }
            } else {
                console.log(error);
            }
        });
    };

    Acl.prototype.GetPermissionsUnder = function (id, callback) {
        var self = this;

        self.DB.all("WITH RECURSIVE\
                UNDER_ROLE(NAME,PARENT,DESCRIPTION,ID) AS (\
                    SELECT '' AS NAME, :id AS PARENT, '' AS DESCRIPTION, 0 AS ID\
                    UNION ALL\
                    SELECT ACL_PERMISSIONS.NAME, UNDER_ROLE.PARENT + 1, ACL_PERMISSIONS.DESCRIPTION, ACL_ROLES.ID\
                        FROM ACL_PERMISSIONS JOIN UNDER_ROLE ON ACL_PERMISSIONS.PARENT=UNDER_ROLE.PARENT\
                        WHERE ACL_PERMISSIONS.ACTIVE = 1\
                        ORDER BY 2\
                )\
            SELECT ID, NAME, PARENT, DESCRIPTION FROM UNDER_ROLE;", {
            ':id': id
        }, function (error, rows) {
            if (error == null) {
                callback(rows);
            } else {
                console.log(error);
            }
        });
    };

    Acl.prototype.LinkPermissionRole = function (permissionId, roleId, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("UPDATE ACL_ROLEPERMISSIONS SET ACTIVE=1, MODIFIED=:now WHERE ROLEID=:rid AND PERMISSIONID=:pid", {
            ':now': now,
            ':rid': roleId,
            ':pid': permissionId
        }, function (error) {
            if (error == null) {
                callback();
            } else {
                self.DB.run("INSERT INTO ACL_ROLEPERMISSIONS(ROLEID, PERMISSIONID, CREATED, MODIFIED, ACTIVE) VALUES(:rid, :pid, :now, :now, 1)", {
                    ':now': now,
                    ':rid': roleId,
                    ':pid': permissionId
                }, function (error) {
                    if (error == null) {
                        callback();
                    } else {
                        console.log(error);
                    }
                });
            }
        });
    };

    Acl.prototype.UnLinkPermissionRole = function (permissionId, roleId, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("UPDATE ACL_ROLEPERMISSIONS SET ACTIVE=0, MODIFIED=:now WHERE ROLEID=:rid AND PERMISSIONID=:pid", {
            ':now': now,
            ':rid': roleId,
            ':pid': permissionId
        }, function (error) {
            if (error == null) {
                callback();
            } else {
                console.log(error);
            }
        });
    };

    Acl.prototype.AssignUserRole = function (userId, roleId, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("UPDATE ACL_USERROLES SET ACTIVE=1, MODIFIED=:now WHERE ROLEID=:rid AND USERID=:uid", {
            ':now': now,
            ':rid': roleId,
            ':uid': userId
        }, function (error) {
            if (error == null) {
                callback();
            } else {
                self.DB.run("INSERT INTO ACL_USERROLES(USERID, ROLEID, CREATED, MODIFIED, ACTIVE) VALUES(:uid, :rid, :now, :now, 1)", {
                    ':now': now,
                    ':rid': roleId,
                    ':uid': userId
                }, function (error) {
                    if (error == null) {
                        callback();
                    } else {
                        console.log(error);
                    }
                });
            }
        });
    };

    Acl.prototype.UnAssignUserRole = function (userId, roleId, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("UPDATE ACL_USERROLES SET ACTIVE=0, MODIFIED=:now WHERE ROLEID=:rid AND USERID=:uid", {
            ':now': now,
            ':rid': roleId,
            ':uid': userId
        }, function (error) {
            if (error == null) {
                callback();
            } else {
                console.log(error);
            }
        });
    };

    Acl.prototype.AddUser = function (username, password, fullname, email, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("INSERT INTO ACL_USERS(USERNAME, PASSWORD, EMAIL, FULLNAME, TYPE, CREATED, MODIFIED, ACTIVE) VALUES(:username, :password, :email, :fullname, 'local', :now, :now, 1)", {
            ':username': username,
            ':password': md5(password).toString(),
            ':email': email,
            ':fullname': fullname,
            ':now': now
        }, function (error) {
            if (error == null) {
                callback();
            } else {
                console.log(error);
            }
        });
    };

    return Acl;
})();

exports.Acl = Acl;
