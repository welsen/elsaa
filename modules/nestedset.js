var NestedSet = (function () {
    function NestedSet($Table, $IDField = "ID", $LeftField = "Left", $RightField = "Right") {
        this.$Table = null;
        this.$Left = $LeftField || "Left";
        this.$Right = $RightField || "Right";
        this.$ID = $IDField || "ID";

        var $this = this;
        $this.Assign($Table, $IDField, $LeftField, $RightField);
    }
    NestedSet.prototype.ID = function () {
        var $this = this;
        return $this.ID;
    }
    NestedSet.prototype.Table = function () {
        var $this = this;
        return $this.Table;
    }
    NestedSet.prototype.Left = function () {
        var $this = this;
        return $this.Left;
    }
    NestedSet.prototype.Right = function () {
        var $this = this;
        return $this.Right;
    }
    /**
     * Assigns fields of the table
     *
     * @param String $Table
     * @param String $ID
     * @param String $Left
     * @param String $Right
     */
    NestedSet.prototype.Assign = function ($Table, $ID, $Left, $Right) {
        var $this = this;

        $this - > Table = $Table;
        $this - > ID = $ID;
        $this - > Left = $Left;
        $this - > Right = $Right;
    }

    /**
     * Returns number of descendants
     *
     * @param Integer $ID
     * @return Integer Count
     */
    NestedSet.prototype.DescendantCount = function ($ID) {
        $Res = jf::SQL("SELECT ({$this->Right()}-{$this->Left()}-1)/2 AS `Count` FROM
        {$this->Table()} WHERE {$this->ID()}=?", $ID);
        return sprintf("%d", $Res[0]["Count"]) * 1;
    }

    /**
     * Returns the depth of a node in the tree
     * Note: this uses Path
     * @param Integer $ID
     * @return Integer Depth from zero upwards
     * @seealso Path
     */
    NestedSet.prototype.Depth = function ($ID) {
        return count($this - > Path($ID)) - 1;
    }
    /**
     * Returns a sibling of the current node
     * Note: You can't find siblings of roots
     * Note: this is a heavy function on nested sets, uses both Children (which is quite heavy) and Path
     * @param Integer $ID
     * @param Integer $SiblingDistance from current node (negative or positive)
     * @return Array Node on success, null on failure
     */
    NestedSet.prototype.Sibling = function ($ID, $SiblingDistance = 1) {
        $Parent = $this - > ParentNode($ID);
        $Siblings = $this - > Children($Parent[$this - > ID()]);
        if (!$Siblings) return null;
        foreach($Siblings as & $Sibling) {
            if ($Sibling[$this - > ID()] == $ID) break;
            $n++;
        }
        return $Siblings[$n + $SiblingDistance];
    }
    /**
     * Returns the parent of a node
     * Note: this uses Path
     * @param Integer $ID
     * @return Array ParentNode (null on failure)
     * @seealso Path
     */
    NestedSet.prototype.ParentNode = function ($ID) {
        $Path = $this - > Path($ID);
        if (count($Path) < 2) return null;
        else return $Path[count($Path) - 2];
    }
    /**
     * Deletes a node and shifts the children up
     *
     * @param Integer $ID
     */
    NestedSet.prototype.Delete = function ($ID) {
        $Info = jf::SQL("SELECT {$this->Left()} AS `Left`,{$this->Right()} AS `Right`
			FROM {$this->Table()}
			WHERE {$this->ID()} = ?;
        ", $ID);
        $Info = $Info[0];

        $count = jf::SQL("DELETE FROM {$this->Table()} WHERE {$this->Left()} = ?", $Info["Left"]);


        jf::SQL("UPDATE {$this->Table()} SET {$this->Right()} = {$this->Right()} - 1, `".$this - > Left.
            "` = {$this->Left()} - 1 WHERE {$this->Left()} BETWEEN ? AND ?", $Info["Left"], $Info["Right"]);
        jf::SQL("UPDATE {$this->Table()} SET {$this->Right()} = {$this->Right()} - 2 WHERE `".$this - > Right.
            "` > ?", $Info["Right"]);
        jf::SQL("UPDATE {$this->Table()} SET {$this->Left()} = {$this->Left()} - 2 WHERE `".$this - > Left.
            "` > ?", $Info["Right"]);
        return $count;
    }
    /**
     * Deletes a node and all its descendants
     *
     * @param Integer $ID
     */
    NestedSet.prototype.DeleteSubtree = function ($ID) {
        $Info = jf::SQL("SELECT {$this->Left()} AS `Left`,{$this->Right()} AS `Right` ,{$this->Right()}-{$this->Left()}+ 1 AS Width
			FROM {$this->Table()}
			WHERE {$this->ID()} = ?;
        ", $ID);
        $Info = $Info[0];

        $count = jf::SQL("
            DELETE FROM {$this->Table()} WHERE {$this->Left()} BETWEEN ? AND ?
        ", $Info["Left"], $Info["Right"]);

        jf::SQL("
            UPDATE {$this->Table()} SET {$this->Right()} = {$this->Right()} - ? WHERE {$this->Right()} > ?
        ", $Info["Width"], $Info["Right"]);
        jf::SQL("
            UPDATE {$this->Table()} SET {$this->Left()} = {$this->Left()} - ? WHERE {$this->Left()} > ?
        ", $Info["Width"], $Info["Right"]);
        return $count;

    }
    /**
     * Returns all descendants of a node
     *
     * @param Integer $ID
     * @param Boolean $AbsoluteDepths to return Depth of sub-tree from zero or absolutely from the whole tree
     * @return Rowset including Depth field
     * @seealso Children
     */
    NestedSet.prototype.Descendants = function ($ID, $AbsoluteDepths) {
        if (!$AbsoluteDepths)
            $DepthConcat = "- (sub_tree.depth )";
        $Res = jf::SQL("
            SELECT node.*, (COUNT(parent.{$this->ID()})-1 $DepthConcat ) AS Depth
            FROM {$this->Table()} AS node,
            	{$this->Table()} AS parent,
            	{$this->Table()} AS sub_parent,
            	(
            		SELECT node.{$this->ID()}, (COUNT(parent.{$this->ID()}) - 1) AS depth
            		FROM {$this->Table()} AS node,
            		{$this->Table()} AS parent
            		WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            		AND node.{$this->ID()} = ?
            		GROUP BY node.{$this->ID()}
            		ORDER BY node.{$this->Left()}
            	) AS sub_tree
            WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            	AND node.{$this->Left()} BETWEEN sub_parent.{$this->Left()} AND sub_parent.{$this->Right()}
            	AND sub_parent.{$this->ID()} = sub_tree.{$this->ID()}
            GROUP BY node.{$this->ID()}
            HAVING Depth > 0
            ORDER BY node.{$this->Left()}", $ID);
        return $Res;
    }
    /**
     * Returns immediate children of a node
     * Note: this function performs the same as Descendants but only returns results with Depth=1
     * @param Integer $ID
     * @return Rowset not including Depth
     * @seealso Descendants
     */
    NestedSet.prototype.Children = function ($ID) {
        $Res = jf::SQL("
            SELECT node.*, (COUNT(parent.{$this->ID()})-1 - (sub_tree.depth )) AS Depth
            FROM {$this->Table()} AS node,
            	{$this->Table()} AS parent,
            	{$this->Table()} AS sub_parent,
           	(
            		SELECT node.{$this->ID()}, (COUNT(parent.{$this->ID()}) - 1) AS depth
            		FROM {$this->Table()} AS node,
            		{$this->Table()} AS parent
            		WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            		AND node.{$this->ID()} = ?
            		GROUP BY node.{$this->ID()}
            		ORDER BY node.{$this->Left()}
            ) AS sub_tree
            WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            	AND node.{$this->Left()} BETWEEN sub_parent.{$this->Left()} AND sub_parent.{$this->Right()}
            	AND sub_parent.{$this->ID()} = sub_tree.{$this->ID()}
            GROUP BY node.{$this->ID()}
            HAVING Depth = 1
            ORDER BY node.{$this->Left()};
        ", $ID);
        if ($Res)
            foreach($Res as & $v)
        unset($v["Depth"]);
        return $Res;
    }
    /**
     * Returns the path to a node, including the node
     *
     * @param Integer $ID
     * @return Rowset nodes in path
     */
    NestedSet.prototype.Path = function ($ID) {
        $Res = jf::SQL("
            SELECT parent.*
            FROM {$this->Table()} AS node,
            ".$this - > Table.
            " AS parent
            WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            AND node.{$this->ID()} = ?
            ORDER BY parent.{$this->Left()}", $ID);
        return $Res;
    }

    /**
     * Finds all leaves of a parent
     *	Note: if you don' specify $PID, There would be one less AND in the SQL Query
     * @param Integer $PID
     * @return Rowset Leaves
     */
    NestedSet.prototype.Leaves = function ($PID) {
        if ($PID)
            $Res = jf::SQL("SELECT *
            FROM {$this->Table()}
            WHERE {$this->Right()} = {$this->Left()} + 1
        	AND {$this->Left()} BETWEEN
            (SELECT {$this->Left()} FROM {$this->Table()} WHERE {$this->ID()}=?)
            	AND
            (SELECT {$this->Right()} FROM {$this->Table()} WHERE {$this->ID()}=?)", $PID, $PID);
        else
            $Res = jf::SQL("SELECT *
            FROM {$this->Table()}
            WHERE {$this->Right()} = {$this->Left()} + 1");
        return $Res;
    }
    /**
     * Adds a sibling after a node
     *
     * @param Integer $ID
     * @return Integer SiblingID
     */
    NestedSet.prototype.InsertSibling = function ($ID) {
        //        $this->DB->AutoQuery("LOCK TABLE {$this->Table()} WRITE;");
        //Find the Sibling
        $Sibl = jf::SQL("SELECT {$this->Right()} AS `Right`".
            " FROM {$this->Table()} WHERE {$this->ID()} = ?", $ID);
        $Sibl = $Sibl[0];
        if ($Sibl == null) {
            $Sibl["Right"] = 0;
        }
        jf::SQL("UPDATE {$this->Table()} SET {$this->Right()} = {$this->Right()} + 2 WHERE {$this->Right()} > ?", $Sibl["Right"]);
        jf::SQL("UPDATE {$this->Table()} SET {$this->Left()} = {$this->Left()} + 2 WHERE {$this->Left()} > ?", $Sibl["Right"]);
        $Res = jf::SQL("INSERT INTO {$this->Table()} ({$this->Left()},{$this->Right()}) ".
            "VALUES(?,?)", $Sibl["Right"] + 1, $Sibl["Right"] + 2);
        //        $this->DB->AutoQuery("UNLOCK TABLES");
        return $Res;
    }
    /**
     * Adds a child to the beginning of a node's children
     *
     * @param Integer $PID
     * @return Integer ChildID
     */
    NestedSet.prototype.InsertChild = function ($PID) {
        //Find the Sibling
        $Sibl = jf::SQL("SELECT {$this->Left()} AS `Left`".
            " FROM {$this->Table()} WHERE {$this->ID()} = ?", $PID);
        $Sibl = $Sibl[0];
        if ($Sibl == null) {
            $Sibl["Left"] = 0;
        }
        jf::SQL("UPDATE {$this->Table()} SET {$this->Right()} = {$this->Right()} + 2 WHERE {$this->Right()} > ?", $Sibl["Left"]);
        jf::SQL("UPDATE {$this->Table()} SET {$this->Left()} = {$this->Left()} + 2 WHERE {$this->Left()} > ?", $Sibl["Left"]);
        $Res = jf::SQL("INSERT INTO {$this->Table()} ({$this->Left()},{$this->Right()}) ".
            "VALUES(?,?)", $Sibl["Left"] + 1, $Sibl["Left"] + 2);
        return $Res;
    }
    /**
     * Retrives the full tree including Depth field.
     *
     * @return 2DArray Rowset
     */
    NestedSet.prototype.FullTree = function () {
        $Res = jf::SQL("SELECT node.*, (COUNT(parent.{$this->ID()}) - 1) AS Depth
            FROM {$this->Table()} AS node,
            {$this->Table()} AS parent
            WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            GROUP BY node.{$this->ID()}
            ORDER BY node.{$this->Left()}");
        return $Res;
    }

    protected
    NestedSet.prototype.Lock = function () {
        jf::SQL("LOCK TABLE {$this->Table()} WRITE");
    }
    protected
    NestedSet.prototype.Unlock = function () {
        jf::SQL("UNLOCK TABLES");
    }
    /**
     * Returns the ID of a node based on a SQL conditional string
     * It accepts other params in the PreparedStatements format
     * @param string $Condition the SQL condition, such as Title=?
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Integer ID
     */
    NestedSet.prototype.GetID = function ($ConditionString, $Rest) {
        $args = func_get_args();
        array_shift($args);
        $Query = "SELECT {$this->ID()} AS ID FROM {$this->Table()} WHERE $ConditionString LIMIT 1";
        array_unshift($args, $Query);
        $Res = call_user_func_array(("jf::SQL"), $args);
        if ($Res)
            return $Res[0]["ID"];
        else
            return null;
    }
    /**
     * Returns the record of a node based on a SQL conditional string
     * It accepts other params in the PreparedStatements format
     * @param String $Condition
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Array Record
     */
    NestedSet.prototype.GetRecord = function ($ConditionString, $Rest) {
        $args = func_get_args();
        array_shift($args);
        $Query = "SELECT * FROM {$this->Table()} WHERE $ConditionString";
        array_unshift($args, $Query);
        $Res = call_user_func_array(("jf::SQL"), $args);
        if ($Res)
            return $Res[0];
        else
            return null;
    }
    /**
     * Returns the depth of a node in the tree
     * Note: this uses Path
     * @param String $ConditionString
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Integer Depth from zero upwards
     * @seealso Path
     */
    NestedSet.prototype.DepthConditional = function ($ConditionString, $Rest) {
        $Arguments = func_get_args();
        $Path = call_user_func_array(array($this, "PathConditional"), $Arguments);

        return count($Path) - 1;
    }
    /**
     * Returns a sibling of the current node
     * Note: You can't find siblings of roots
     * Note: this is a heavy function on nested sets, uses both Children (which is quite heavy) and Path
     * @param Integer $SiblingDistance from current node (negative or positive)
     * @param string $ConditionString
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Array Node on success, null on failure
     */
    NestedSet.prototype.SiblingConditional = function ($SiblingDistance = 1, $ConditionString, $Rest) {
        $Arguments = func_get_args();
        $ConditionString = $ConditionString; //prevent warning
        array_shift($Arguments); //Rid $SiblingDistance
        $Parent = call_user_func_array(array($this, "ParentNodeConditional"), $Arguments);
        $Siblings = $this - > Children($Parent[$this - > ID()]);
        if (!$Siblings) return null;
        $ID = call_user_func_array(array($this, "GetID"), $Arguments);
        foreach($Siblings as & $Sibling) {
            if ($Sibling[$this - > ID()] == $ID) break;
            $n++;
        }
        return $Siblings[$n + $SiblingDistance];
    }
    /**
     * Returns the parent of a node
     * Note: this uses Path
     * @param string $ConditionString
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Array ParentNode (null on failure)
     * @seealso Path
     */
    NestedSet.prototype.ParentNodeConditional = function ($ConditionString, $Rest) {
        $Arguments = func_get_args();
        $Path = call_user_func_array(array($this, "PathConditional"), $Arguments);
        if (count($Path) < 2) return null;
        else return $Path[count($Path) - 2];
    }
    /**
     * Deletes a node and shifts the children up
     * Note: use a condition to support only 1 row, LIMIT 1 used.
     * @param String $ConditionString
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return boolean
     */
    NestedSet.prototype.DeleteConditional = function ($ConditionString, $Rest) {
        $this - > Lock();
        $Arguments = func_get_args();
        array_shift($Arguments);
        $Query = "SELECT {$this->Left()} AS `Left`,{$this->Right()} AS `Right`
			FROM {$this->Table()}
			WHERE $ConditionString LIMIT 1";

        array_unshift($Arguments, $Query);
        $Info = call_user_func_array("jf::SQL", $Arguments);
        if (!$Info) {
            $this - > Unlock();
            return false;
        }
        $Info = $Info[0];

        $count = jf::SQL("DELETE FROM {$this->Table()} WHERE {$this->Left()} = ?", $Info["Left"]);

        jf::SQL("UPDATE {$this->Table()} SET {$this->Right()} = {$this->Right()} - 1, {$this->Left()} = {$this->Left()} - 1 WHERE {$this->Left()} BETWEEN ? AND ?", $Info["Left"], $Info["Right"]);
        jf::SQL("UPDATE {$this->Table()} SET {$this->Right()} = {$this->Right()} - 2 WHERE {$this->Right()} > ?", $Info["Right"]);
        jf::SQL("UPDATE {$this->Table()} SET {$this->Left()} = {$this->Left()} - 2 WHERE {$this->Left()} > ?", $Info["Right"]);
        $this - > Unlock();
        return $count == 1;
    }
    /**
     * Deletes a node and all its descendants
     *
     * @param String $ConditionString
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     */
    NestedSet.prototype.DeleteSubtreeConditional = function ($ConditionString, $Rest) {
        $this - > Lock();
        $Arguments = func_get_args();
        array_shift($Arguments);
        $Query = "SELECT {$this->Left()} AS `Left`,{$this->Right()} AS `Right` ,{$this->Right()}-{$this->Left()}+ 1 AS Width
			FROM {$this->Table()}
			WHERE $ConditionString";

        array_unshift($Arguments, $Query);
        $Info = call_user_func_array("jf::SQL", $Arguments);

        $Info = $Info[0];

        $count = jf::SQL("
            DELETE FROM {$this->Table()} WHERE {$this->Left()} BETWEEN ? AND ?
        ", $Info["Left"], $Info["Right"]);

        jf::SQL("
            UPDATE {$this->Table()} SET {$this->Right()} = {$this->Right()} - ? WHERE {$this->Right()} > ?
        ", $Info["Width"], $Info["Right"]);
        jf::SQL("
            UPDATE {$this->Table()} SET {$this->Left()} = {$this->Left()} - ? WHERE {$this->Left()} > ?
        ", $Info["Width"], $Info["Right"]);
        $this - > Unlock();
        return $count >= 1;
    }
    /**
     * Returns all descendants of a node
     * Note: use only a sinlge condition here
     * @param boolean $AbsoluteDepths to return Depth of sub-tree from zero or absolutely from the whole tree
     * @param string $Condition
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Rowset including Depth field
     * @seealso Children
     */
    NestedSet.prototype.DescendantsConditional = function ($AbsoluteDepths, $ConditionString, $Rest) {
        if (!$AbsoluteDepths)
            $DepthConcat = "- (sub_tree.innerDepth )";
        $Arguments = func_get_args();
        array_shift($Arguments);
        array_shift($Arguments); //second argument, $AbsoluteDepths
        $Query = "
            SELECT node.*, (COUNT(parent.{$this->ID()})-1 $DepthConcat) AS Depth
            FROM {$this->Table()} AS node,
            	{$this->Table()} AS parent,
            	{$this->Table()} AS sub_parent,
            	(
            		SELECT node.{$this->ID()}, (COUNT(parent.{$this->ID()}) - 1) AS innerDepth
            		FROM {$this->Table()} AS node,
            		{$this->Table()} AS parent
            		WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            		AND (node.$ConditionString)
            		GROUP BY node.{$this->ID()}
            		ORDER BY node.{$this->Left()}
            	) AS sub_tree
            WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            	AND node.{$this->Left()} BETWEEN sub_parent.{$this->Left()} AND sub_parent.{$this->Right()}
            	AND sub_parent.{$this->ID()} = sub_tree.{$this->ID()}
            GROUP BY node.{$this->ID()}
            HAVING Depth > 0
            ORDER BY node.{$this->Left()}";

        array_unshift($Arguments, $Query);
        $Res = call_user_func_array("jf::SQL", $Arguments);

        return $Res;
    }
    /**
     * Returns immediate children of a node
     * Note: this function performs the same as Descendants but only returns results with Depth=1
     * Note: use only a sinlge condition here
     * @param string $ConditionString
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Rowset not including Depth
     * @seealso Descendants
     */
    NestedSet.prototype.ChildrenConditional = function ($ConditionString, $Rest) {
        $Arguments = func_get_args();
        array_shift($Arguments);
        $Query = "
            SELECT node.*, (COUNT(parent.{$this->ID()})-1 - (sub_tree.innerDepth )) AS Depth
            FROM {$this->Table()} AS node,
            	{$this->Table()} AS parent,
            	{$this->Table()} AS sub_parent,
           	(
            		SELECT node.{$this->ID()}, (COUNT(parent.{$this->ID()}) - 1) AS innerDepth
            		FROM {$this->Table()} AS node,
            		{$this->Table()} AS parent
            		WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            		AND (node.$ConditionString)
            		GROUP BY node.{$this->ID()}
            		ORDER BY node.{$this->Left()}
            ) AS sub_tree
            WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            	AND node.{$this->Left()} BETWEEN sub_parent.{$this->Left()} AND sub_parent.{$this->Right()}
            	AND sub_parent.{$this->ID()} = sub_tree.{$this->ID()}
            GROUP BY node.{$this->ID()}
            HAVING Depth = 1
            ORDER BY node.{$this->Left()}";

        array_unshift($Arguments, $Query);
        $Res = call_user_func_array("jf::SQL", $Arguments);
        if ($Res)
            foreach($Res as & $v)
        unset($v["Depth"]);
        return $Res;
    }
    /**
     * Returns the path to a node, including the node
     * Note: use a single condition, or supply "node." before condition fields.
     * @param string $ConditionString
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Rowset nodes in path
     */
    NestedSet.prototype.PathConditional = function ($ConditionString, $Rest) {
        $Arguments = func_get_args();
        array_shift($Arguments);
        $Query = "
            SELECT parent.*
            FROM {$this->Table()} AS node,
            {$this->Table()} AS parent
            WHERE node.{$this->Left()} BETWEEN parent.{$this->Left()} AND parent.{$this->Right()}
            AND ( node.$ConditionString )
            ORDER BY parent.{$this->Left()}";

        array_unshift($Arguments, $Query);
        $Res = call_user_func_array("jf::SQL", $Arguments);
        return $Res;
    }

    /**
     * Finds all leaves of a parent
     *	Note: if you don' specify $PID, There would be one less AND in the SQL Query
     * @param String $ConditionString
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Rowset Leaves
     */
    NestedSet.prototype.LeavesConditional = function ($ConditionString, $Rest) {
        if ($ConditionString) {
            $Arguments = func_get_args();
            array_shift($Arguments);
            if ($ConditionString) $ConditionString = "WHERE $ConditionString";

            $Query = "SELECT *
                FROM {$this->Table()}
                WHERE {$this->Right()} = {$this->Left()} + 1
            	AND {$this->Left()} BETWEEN
                (SELECT {$this->Left()} FROM {$this->Table()} $ConditionString)
                	AND
                (SELECT {$this->Right()} FROM {$this->Table()} $ConditionString)";

            $Arguments = array_merge($Arguments, $Arguments);
            array_unshift($Arguments, $Query);
            $Res = call_user_func_array("jf::SQL", $Arguments);
        } else
            $Res = jf::SQL("SELECT *
            FROM {$this->Table()}
            WHERE {$this->Right()} = {$this->Left()} + 1");
        return $Res;
    }
    /**
     * Adds a sibling after a node
     *
     * @param array $FieldValueArray Pairs of Key/Value as Field/Value in the table
     * @param string $ConditionString
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string
     * @return Integer SiblingID
     */
    NestedSet.prototype.InsertSiblingData = function ($FieldValueArray, $ConditionString, $Rest) {
        $this - > Lock();
        //Find the Sibling
        $Arguments = func_get_args();
        array_shift($Arguments); //first argument, the array
        array_shift($Arguments);
        if ($ConditionString) $ConditionString = "WHERE $ConditionString";
        $Query = "SELECT {$this->Right()} AS `Right`".
        " FROM {$this->Table()} $ConditionString";

        array_unshift($Arguments, $Query);
        $Sibl = call_user_func_array("jf::SQL", $Arguments);

        $Sibl = $Sibl[0];
        if ($Sibl == null) {
            $Sibl["Left"] = $Sibl["Right"] = 0;
        }
        jf::SQL("UPDATE {$this->Table()} SET {$this->Right()} = {$this->Right()} + 2 WHERE {$this->Right()} > ?", $Sibl["Right"]);
        jf::SQL("UPDATE {$this->Table()} SET {$this->Left()} = {$this->Left()} + 2 WHERE {$this->Left()} > ?", $Sibl["Right"]);

        $FieldsString = $ValuesString = "";
        $Values = array();
        if ($FieldValueArray)
            foreach($FieldValueArray as $k = > $v) {
                $FieldsString. = ",";
                $FieldsString. = "`".$k.
                "`";
                $ValuesString. = ",?";
                $Values[] = $v;
            }

        $Query = "INSERT INTO {$this->Table()} ({$this->Left()},{$this->Right()} $FieldsString) ".
        "VALUES(?,? $ValuesString)";
        array_unshift($Values, $Sibl["Right"] + 2);
        array_unshift($Values, $Sibl["Right"] + 1);
        array_unshift($Values, $Query);

        $Res = call_user_func_array("jf::SQL", $Values);
        $this - > Unlock();
        return $Res;
    }
    /**
     * Adds a child to the beginning of a node's children
     *
     * @param Array $FieldValueArray key-paired field-values to insert
     * @param string $ConditionString of the parent node
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Integer ChildID
     */
    NestedSet.prototype.insertChildData = function ($FieldValueArray, $ConditionString, $Rest) {
        $this - > Lock();
        //Find the Sibling
        $Arguments = func_get_args();
        array_shift($Arguments); //first argument, the array
        array_shift($Arguments);
        if ($ConditionString) $ConditionString = "WHERE $ConditionString";
        $Query = "SELECT {$this->Right()} AS `Right`, {$this->Left()} AS `Left`".
        " FROM {$this->Table()} $ConditionString";
        array_unshift($Arguments, $Query);
        $Parent = call_user_func_array("jf::SQL", $Arguments);

        $Parent = $Parent[0];
        if ($Parent == null) {
            $Parent["Left"] = $Parent["Right"] = 0;
        }
        jf::SQL("UPDATE {$this->Table()} SET {$this->Right()} = {$this->Right()} + 2 WHERE {$this->Right()} >= ?", $Parent["Right"]);
        jf::SQL("UPDATE {$this->Table()} SET {$this->Left()} = {$this->Left()} + 2 WHERE {$this->Left()} > ?", $Parent["Right"]);

        $FieldsString = $ValuesString = "";
        $Values = array();
        if ($FieldValueArray)
            foreach($FieldValueArray as $k = > $v) {
                $FieldsString. = ",";
                $FieldsString. = "`".$k.
                "`";
                $ValuesString. = ",?";
                $Values[] = $v;
            }
        $Query = "INSERT INTO {$this->Table()} ({$this->Left()},{$this->Right()} $FieldsString) ".
        "VALUES(?,? $ValuesString)";
        array_unshift($Values, $Parent["Right"] + 1);
        array_unshift($Values, $Parent["Right"]);
        array_unshift($Values, $Query);
        $Res = call_user_func_array("jf::SQL", $Values);
        $this - > Unlock();
        return $Res;
    }
    /**
     * Edits a node
     *
     * @param Array $FieldValueArray Pairs of Key/Value as Field/Value in the table to edit
     * @param string $ConditionString
     * @param string $Rest optional, rest of variables to fill in placeholders of condition string, one variable for each ? in condition
     * @return Integer SiblingID
     */
    NestedSet.prototype.EditData = function ($FieldValueArray, $ConditionString, $Rest) {
        //Find the Sibling
        $Arguments = func_get_args();
        array_shift($Arguments); //first argument, the array
        array_shift($Arguments);
        if ($ConditionString) $ConditionString = "WHERE $ConditionString";



        $FieldsString = "";
        $Values = array();
        if ($FieldValueArray)
            foreach($FieldValueArray as $k = > $v) {
                if ($FieldsString != "") $FieldsString. = ",";
                $FieldsString. = "`".$k.
                "`=?";
                $Values[] = $v;
            }
        $Query = "UPDATE {$this->Table()} SET $FieldsString $ConditionString";

        array_unshift($Values, $Query);
        $Arguments = array_merge($Values, $Arguments);

        return call_user_func_array("jf::SQL", $Arguments);
    }

    return NestedSet;
})();

exports.NestedSet = NestedSet;
