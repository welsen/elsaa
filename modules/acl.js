var md5 = require("crypto-js/md5");
var logger = require('log4js').getLogger();
var us = require('underscore');

var Acl = (function () {
    'use strict';

    function Acl(db) {
        this.DB = db;
        this.Auth = {};
        var self = this;
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
                logger.error(error);
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
                logger.error(error);
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
                            logger.error(error);
                        }
                    });
                }
            } else {
                logger.error(error);
            }
        });
    };

    Acl.prototype.GetRolesUnder = function (id, callback) {
        var self = this;

        self.DB.all("WITH RECURSIVE\
                UNDER_ROLE(NAME,PARENT,DESCRIPTION,ID) AS (\
                    SELECT '' AS NAME, 0 AS PARENT, '' AS DESCRIPTION, :id AS ID\
                    UNION ALL\
                    SELECT ACL_ROLES.NAME, UNDER_ROLE.PARENT + 1, ACL_ROLES.DESCRIPTION, ACL_ROLES.ID\
                        FROM ACL_ROLES JOIN UNDER_ROLE ON ACL_ROLES.PARENT=UNDER_ROLE.ID\
                        WHERE ACL_ROLES.ACTIVE = 1\
                        ORDER BY 2 DESC\
                )\
            SELECT ID, NAME, PARENT, DESCRIPTION FROM UNDER_ROLE WHERE PARENT > 0;", {
            ':id': id
        }, function (error, rows) {
            if (error == null) {
                callback(rows);
            } else {
                logger.error(error);
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
                logger.error(error);
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
                logger.error(error);
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
                            logger.error(error);
                        }
                    });
                }
            } else {
                logger.error(error);
            }
        });
    };

    Acl.prototype.GetPermissionsUnder = function (permission, callback) {
        var self = this;

        self.DB.all("WITH RECURSIVE\
                        UNDER_PERMISSION(NAME,PARENT,DESCRIPTION,ID) AS (\
                            SELECT :name AS NAME, 0 AS PARENT, :desc AS DESCRIPTION, :id AS ID\
                            UNION ALL\
                            SELECT ACL_PERMISSIONS.NAME, UNDER_PERMISSION.PARENT + 1, ACL_PERMISSIONS.DESCRIPTION, ACL_PERMISSIONS.ID\
                                FROM ACL_PERMISSIONS JOIN UNDER_PERMISSION ON ACL_PERMISSIONS.PARENT=UNDER_PERMISSION.ID\
                                WHERE ACL_PERMISSIONS.ACTIVE = 1\
                                ORDER BY 2 DESC\
                        )\
                    SELECT ID, NAME, PARENT, DESCRIPTION FROM UNDER_PERMISSION;", {
            ':id': permission.ID,
            ':name': permission.NAME,
            ':desc': permission.DESCRIPTION
        }, function (error, rows) {
            if (error == null) {
                callback(rows);
            } else {
                logger.error(error);
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
                        logger.error(error);
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
                logger.error(error);
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
                        logger.error(error);
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
                logger.error(error);
            }
        });
    };

    Acl.prototype.AddLocalUser = function (username, password, fullname, email, callback) {
        var self = this;
        self.AddUser(username, password, fullname, email, 'local', callback);
    };

    Acl.prototype.AddLDAPUser = function (username, password, fullname, email, callback) {
        var self = this;
        self.AddUser(username, password, fullname, email, 'ldap', callback);
    };

    Acl.prototype.AddUser = function (username, password, fullname, email, type, callback) {
        var self = this;
        var now = (new Date()).getTime();

        self.DB.run("INSERT INTO ACL_USERS(USERNAME, PASSWORD, EMAIL, FULLNAME, TYPE, CREATED, MODIFIED, ACTIVE) VALUES(:username, :password, :email, :fullname, :type, :cnow, :mnow, 1)", {
            ':username': username,
            ':password': md5(password).toString(),
            ':email': email,
            ':fullname': fullname,
            ':type': type,
            ':cnow': now,
            ':mnow': now
        }, function (error) {
            if (error == null) {
                callback();
            } else {
                logger.error(error);
            }
        });
    };

    Acl.prototype.Authenticate = function (username, password, callback) {
        var self = this;
        var token = md5((new Date()).getTime().toString()).toString();

        self.DB.get("SELECT ID, USERNAME, FULLNAME, EMAIL FROM ACL_USERS WHERE USERNAME=:username AND PASSWORD=:password AND ACTIVE=1;", {
            ':username': username,
            ':password': md5(password).toString()
        }, function (error, row) {
            if (error == null) {
                if (row !== undefined) {
                    var user = row;
                    self.Auth[token] = {
                        'user': user,
                        'permissions': []
                    };
                    self.DB.all("SELECT ACL_PERMISSIONS.ID, ACL_PERMISSIONS.NAME, ACL_PERMISSIONS.DESCRIPTION\
                            FROM ACL_USERROLES\
                            JOIN ACL_ROLEPERMISSIONS ON ACL_USERROLES.ROLEID = ACL_ROLEPERMISSIONS.ROLEID\
                            JOIN ACL_PERMISSIONS ON ACL_ROLEPERMISSIONS.PERMISSIONID = ACL_PERMISSIONS.ID\
                            WHERE USERID=:uid AND ACL_USERROLES.ACTIVE=1;", {
                        ':uid': user.ID
                    }, function (error, rows) {
                        if (error == null) {
                            self.Auth[token].rolecount = rows.length;
                            self.Auth[token].c = 0;
                            for (var idx in rows) {
                                var permission = rows[idx];
                                self.GetPermissionsUnder(permission, function (data) {
                                    data.forEach(function (perm) {
                                        var exists = us.findWhere(self.Auth[token].permissions, perm) != undefined;
                                        if (!exists) {
                                            self.Auth[token].permissions.push(perm);
                                        }
                                    });
                                    self.Auth[token].c++;
                                    // debugger;
                                    if (self.IsAuthReady(self.Auth[token].c, token)) {
                                        self.OnAuthenticationDone(token, callback);
                                    }
                                });
                            };
                        }
                    });
                } else {
                    callback(false);
                }
            } else {
                logger.error(error);
                callback(false);
            }
        });
    };

    Acl.prototype.IsAuthReady = function (c, token) {
        var self = this;
        return c == self.Auth[token].rolecount;
    };

    Acl.prototype.OnAuthenticationDone = function (token, callback) {
        var self = this;
        var permissions = {};
        self.Auth[token].permissions.forEach(function (permission) {
            if (!permissions.hasOwnProperty(permission.NAME)) {
                permissions[permission.NAME] = true;
            }
        });
        self.Auth[token].perms = permissions;
        callback(self.Auth[token]);
        // delete self.Auth[token];
    };

    return Acl;
})();

exports.Acl = Acl;
