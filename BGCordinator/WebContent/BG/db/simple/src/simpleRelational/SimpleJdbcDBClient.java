/**
 * Copyright (c) 2010 Yahoo! Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you
 * may not use this file except in compliance with the License. You
 * may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * permissions and limitations under the License. See accompanying
 * LICENSE file.
 */


//author sumita barahmand

package simpleRelational;

import com.yahoo.ycsb.Client;
import com.yahoo.ycsb.DB;
import com.yahoo.ycsb.DBException;
import com.yahoo.ycsb.ByteIterator;
import com.yahoo.ycsb.ObjectByteIterator;

import java.io.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * A class that wraps a JDBC compliant database to allow it to be interfaced with YCSB.
 * This class extends {@link DB} and implements the database interface used by YCSB client.
 *
 * <br> Each client will have its own instance of this class. This client is
 * not thread safe.
 *
 * <br> This interface expects a schema <key> <field1> <field2> <field3> ...
 * All attributes are of type VARCHAR. All accesses are through the primary key. Therefore,
 * only one index on the primary key is needed.
 *
 * <p> The following options must be passed when using this database client.
 *
 * <ul>
 * <li><b>db.driver</b> The JDBC driver class to use.</li>
 * <li><b>db.url</b> The Database connection URL.</li>
 * <li><b>db.user</b> User name for the connection.</li>
 * <li><b>db.passwd</b> Password for the connection.</li>
 * </ul>
 *
 * 
 *
 */
public class SimpleJdbcDBClient extends DB implements JdbcDBClientConstants {

	private static String FSimagePath = "";
	private boolean initialized = false;
	private Properties props;
	private static final String DEFAULT_PROP = "";
	private ConcurrentMap<Integer, PreparedStatement> newCachedStatements;
	private PreparedStatement preparedStatement;
	private Connection conn;
	private static int GETFRNDCNT_STMT = 2;
	private static int GETPENDCNT_STMT = 3;
	private static int GETRESCNT_STMT = 4;
	private static int GETPROFILE_STMT = 5;
	private static int GETPROFILEIMG_STMT = 6;
	private static int GETFRNDS_STMT = 7;
	private static int GETFRNDSIMG_STMT = 8;
	private static int GETPEND_STMT = 9;
	private static int GETPENDIMG_STMT = 10;
	private static int REJREQ_STMT = 11;
	private static int ACCREQ_STMT = 12;
	private static int INVFRND_STMT = 13;
	private static int UNFRNDFRND_STMT = 14;
	private static int GETTOPRES_STMT = 15;
	private static int GETRESCMT_STMT = 16;
	private static int POSTCMT_STMT = 17;
	private static int INSFRND_STMT = 18;
	private static int IMAGE_SIZE_GRAN = 1024;
	private int THUMB_IMAGE_SIZE = 2*1024;
	

	
	private PreparedStatement createAndCacheStatement(int stmttype, String query) throws SQLException{
		PreparedStatement newStatement = conn.prepareStatement(query);
		PreparedStatement stmt = newCachedStatements.putIfAbsent(stmttype, newStatement);
		if (stmt == null) return newStatement;
		else return stmt;
	}
	
	private boolean StoreImageInFS(String userid, byte[] image, boolean profileimg){
		boolean result = true;
		String ext = "thumbnail";
		
		if (profileimg) ext = "profile";
		
		String ImageFileName = FSimagePath+"\\img"+userid+ext;
		
		File tgt = new File(ImageFileName);
		if ( tgt.exists() ){
			if (! tgt.delete() ) {
				System.out.println("Error, file exists and failed to delete");
				return false;
			}
		}

		//Write the file
		try{
			FileOutputStream fos = new FileOutputStream(ImageFileName);
			fos.write(image);
			fos.close();
		}catch(Exception ex){
			System.out.println("Error in writing the file"+ImageFileName);
			ex.printStackTrace(System.out);
		}

		return result;
	}
	
	 private byte[] GetImageFromFS(String userid, boolean profileimg){
         int filelength = 0;
         String ext = "thumbnail";
        
         if (profileimg) ext = "profile";
        
         String ImageFileName = FSimagePath+"\\img"+userid+ext;
        
         File fsimage = new File(ImageFileName); 
         filelength = (int) fsimage.length();
         byte[] imgpayload = new byte[filelength];
         //reading the thumbnailimage byte as a byte array
         DataInputStream dis;
         try {
                 FileInputStream fis = new FileInputStream(fsimage);
                 dis = new DataInputStream(fis);
                 int read = 0;
                 int numRead = 0;
                 while (read < filelength && (numRead=dis.read(imgpayload, read, filelength - read    ) ) >= 0) {
                         read = read + numRead;
                 }
                 dis.close();
                 fis.close();
         } catch (IOException e) {
                 // TODO Auto-generated catch block
                 e.printStackTrace(System.out);
         }


         return imgpayload;
 }

		private void cleanupAllConnections() {
		try {
			//close all cached prepare statements
			Set<Integer> statementTypes = newCachedStatements.keySet();
			Iterator<Integer> it = statementTypes.iterator();
			while(it.hasNext()){
				int stmtType = it.next();
				if(newCachedStatements.get(stmtType) != null) newCachedStatements.get(stmtType).close();
			}
			if(conn != null )conn.close();
		} catch (SQLException e) {
			e.printStackTrace(System.out);
		}
	}

	/**
	 * Initialize the database connection and set it up for sending requests to the database.
	 * This must be called once per client.
	 * 
	 */
	@Override
	public void init() throws DBException {
		if (initialized) {
			System.out.println("Client connection already initialized.");
			return;
		}
		props = getProperties();
		String urls = props.getProperty(CONNECTION_URL, DEFAULT_PROP);
		String user = props.getProperty(CONNECTION_USER, DEFAULT_PROP);
		String passwd = props.getProperty(CONNECTION_PASSWD, DEFAULT_PROP);
		String driver = props.getProperty(DRIVER_CLASS);

		try {
			if (driver != null) {
				Class.forName(driver);
			}
			for (String url: urls.split(",")) {
				conn = DriverManager.getConnection(url, user, passwd);
				// Since there is no explicit commit method in the DB interface, all
				// operations should auto commit.
				conn.setAutoCommit(true);
			}

			//System.out.println("Using " + shardCount + " shards");

			newCachedStatements = new ConcurrentHashMap<Integer, PreparedStatement>();
		} catch (ClassNotFoundException e) {
			System.out.println("Error in initializing the JDBS driver: " + e);
			throw new DBException(e);
		} catch (SQLException e) {
			System.out.println("Error in database operation: " + e);
			throw new DBException(e);
		} catch (NumberFormatException e) {
			System.out.println("Invalid value for fieldcount property. " + e);
			throw new DBException(e);
		}
		initialized = true;
	}

	@Override
	public void cleanup(boolean warmup) {
		
		cleanupAllConnections();
	}

	@Override
	public int insertEntity(String entitySet, String entityPK, HashMap<String, ByteIterator> values, boolean insertImage, int imageSize) {
		if (entitySet == null) {
			return -1;
		}
		if (entityPK == null) {
			return -1;
		}
		ResultSet rs =null;
		try {
			String query;
			int numFields = values.size();
			if(entitySet.equalsIgnoreCase("users") && insertImage && !FSimagePath.equals(""))
				numFields = numFields-2;
			query = "INSERT INTO "+entitySet+" VALUES (";
			for(int j=0; j<=numFields; j++){
				if(j==(numFields)){
					query+="?)";
					break;
				}else
					query+="?,";
			}

			preparedStatement = conn.prepareStatement(query);
			preparedStatement.setString(1, entityPK);
			int cnt=2;
			for (Map.Entry<String, ByteIterator> entry : values.entrySet()) {
				//blobs need to be inserted differently
				if(entry.getKey().equalsIgnoreCase("pic") || entry.getKey().equalsIgnoreCase("tpic") )
					continue;
				
				String field = entry.getValue().toString();
				preparedStatement.setString(cnt, field);
				cnt++;
			}
			if(entitySet.equalsIgnoreCase("users") && insertImage){
				byte[] profileImage = ((ObjectByteIterator)values.get("pic")).toArray();
				InputStream is = new ByteArrayInputStream(profileImage);
				if ( FSimagePath.equals("") )
					preparedStatement.setBinaryStream(numFields, is, profileImage.length);
				else
					StoreImageInFS(entityPK, profileImage, true);
				
				byte[] thumbImage = ((ObjectByteIterator)values.get("tpic")).toArray();
				is = new ByteArrayInputStream(thumbImage);
				
				if (FSimagePath.equals(""))
					preparedStatement.setBinaryStream(numFields+1, is, thumbImage.length);
				else
					StoreImageInFS(entityPK, thumbImage, false);
			}
			rs = preparedStatement.executeQuery();
		} catch (SQLException e) {
			System.out.println("Error in processing insert to table: " + entitySet + e);
			return -2;
		} finally{
			try {
				if (rs != null)
					rs.close();
				if(preparedStatement != null)
					preparedStatement.close();
			} catch (SQLException e) {
				e.printStackTrace(System.out);
				return -1;
			}
		}
		return 0;
	}

	@Override
	public int viewProfile(int requesterID, int profileOwnerID,
			HashMap<String, ByteIterator> result, boolean insertImage, boolean testMode) {

		ResultSet rs = null;
		int retVal = SUCCESS;
		if(requesterID < 0 || profileOwnerID < 0)
			return -1;

		String query="";
		String uid="";

		try {
			//friend count
			query = "SELECT count(*) FROM  friendship WHERE (inviterID = ? ) AND status = 2 ";
			//preparedStatement = conn.prepareStatement(query);
			if((preparedStatement = newCachedStatements.get(GETFRNDCNT_STMT)) == null)
				preparedStatement = createAndCacheStatement(GETFRNDCNT_STMT, query);
			
			preparedStatement.setInt(1, profileOwnerID);
			rs = preparedStatement.executeQuery();
			if (rs.next())
				result.put("friendcount", new ObjectByteIterator(rs.getString(1).getBytes())) ;
			else
				result.put("friendcount", new ObjectByteIterator("0".getBytes())) ;


		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if (rs != null)
					rs.close();
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				e.printStackTrace(System.out);
				retVal = -2;
			}
		}

		//pending friend request count
		//if owner viwing her own profile, she can view her pending friend requests
		if(requesterID == profileOwnerID){
			query = "SELECT count(*) FROM  friendship WHERE inviteeID = ? AND status = 1 ";
			try {
				//preparedStatement = conn.prepareStatement(query);
				if((preparedStatement = newCachedStatements.get(GETPENDCNT_STMT)) == null)
					preparedStatement = createAndCacheStatement(GETPENDCNT_STMT, query);
				
				preparedStatement.setInt(1, profileOwnerID);
				rs = preparedStatement.executeQuery();
				if (rs.next())
					result.put("pendingcount", new ObjectByteIterator(rs.getString(1).getBytes())) ;
				else
					result.put("pendingcount", new ObjectByteIterator("0".getBytes())) ;
			}catch(SQLException sx){
				retVal = -2;
				sx.printStackTrace(System.out);
			}finally{
				try {
					if (rs != null)
						rs.close();
					if(preparedStatement != null)
						preparedStatement.clearParameters();
						//preparedStatement.close();
				} catch (SQLException e) {
					e.printStackTrace(System.out);
					retVal = -2;
				}
			}
		}
		//resource count
		query = "SELECT count(*) FROM  resources WHERE wallUserID = ?";

		try {
			//preparedStatement = conn.prepareStatement(query);
			if((preparedStatement = newCachedStatements.get(GETRESCNT_STMT)) == null)
				preparedStatement = createAndCacheStatement(GETRESCNT_STMT, query);
			
			preparedStatement.setInt(1, profileOwnerID);
			rs = preparedStatement.executeQuery();
			if (rs.next())
				result.put("resourcecount", new ObjectByteIterator(rs.getString(1).getBytes())) ;
			else
				result.put("resourcecount", new ObjectByteIterator("0".getBytes())) ;
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if (rs != null)
					rs.close();
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}
		
		try {
			//profile details
			if(insertImage){
				query = "SELECT userid,username, fname, lname, gender, dob, jdate, ldate, address, email, tel, pic FROM  users WHERE UserID = ?";
				if((preparedStatement = newCachedStatements.get(GETPROFILEIMG_STMT)) == null)
					preparedStatement = createAndCacheStatement(GETPROFILEIMG_STMT, query);
				
			}else{
				query = "SELECT userid,username, fname, lname, gender, dob, jdate, ldate, address, email, tel FROM  users WHERE UserID = ?";
				if((preparedStatement = newCachedStatements.get(GETPROFILE_STMT)) == null)
					preparedStatement = createAndCacheStatement(GETPROFILE_STMT, query);
			}
			//preparedStatement = conn.prepareStatement(query);
			preparedStatement.setInt(1, profileOwnerID);
			rs = preparedStatement.executeQuery();
			ResultSetMetaData md = rs.getMetaData();
			int col = md.getColumnCount();
			if(rs.next()){
				for (int i = 1; i <= col; i++){
					String col_name = md.getColumnName(i);
					String value ="";
					if (col_name.equalsIgnoreCase("userid")){
						uid = rs.getString(col_name);
					}
					if(col_name.equalsIgnoreCase("pic") ){
						// Get as a BLOB
						Blob aBlob = rs.getBlob(col_name);
						byte[] allBytesInBlob = aBlob.getBytes(1, (int) aBlob.length());
						//if test mode dump pic into a file
						if(testMode){
							//dump to file
							try{
								FileOutputStream fos = new FileOutputStream(profileOwnerID+"-proimage.bmp");
								fos.write(allBytesInBlob);
								fos.close();
							}catch(Exception ex){
							}
						}
						result.put(col_name, new ObjectByteIterator(allBytesInBlob));
					}else{
						value = rs.getString(col_name);
						result.put(col_name, new ObjectByteIterator(value.getBytes()));
					}	
					
				}
				//Fetch the profile image from the file system
				if (insertImage && !FSimagePath.equals("") ){
					//Get the profile image from the file
					byte[] profileImage = GetImageFromFS(uid, true);
					if(testMode){
						//dump to file
						try{
							FileOutputStream fos = new FileOutputStream(profileOwnerID+"-proimage.bmp");
							fos.write(profileImage);
							fos.close();
						}catch(Exception ex){
						}
					}
					result.put("pic", new ObjectByteIterator(profileImage) );
				}

			}

		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if (rs != null)
					rs.close();
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}

		return retVal;
	}


	@Override
	public int listFriends(int requesterID, int profileOwnerID,
			Set<String> fields, Vector<HashMap<String, ByteIterator>> result, boolean insertImage, boolean testMode) {

		int retVal = SUCCESS;
		ResultSet rs = null;
		if(requesterID < 0 || profileOwnerID < 0)
			return -1;

		String query ="";
		String uid="";
		
		try {
			if(insertImage && FSimagePath.equals("")){
				query = "SELECT userid, inviterid, inviteeid, username, fname, lname, gender, dob, jdate, ldate, address,email,tel,tpic FROM users, friendship WHERE  (inviterid=? and userid=inviteeid) and status = 2";
				if((preparedStatement = newCachedStatements.get(GETFRNDSIMG_STMT)) == null)
					preparedStatement = createAndCacheStatement(GETFRNDSIMG_STMT, query);
			}else{
				query = "SELECT userid, inviterid, inviteeid, username, fname, lname, gender, dob, jdate, ldate, address,email,tel FROM users, friendship WHERE (inviterid=? and userid=inviteeid) and status = 2";
				if((preparedStatement = newCachedStatements.get(GETFRNDS_STMT)) == null)
					preparedStatement = createAndCacheStatement(GETFRNDS_STMT, query);
			}
			//preparedStatement = conn.prepareStatement(query);
			preparedStatement.setInt(1, profileOwnerID);
			rs = preparedStatement.executeQuery();
			int cnt =0;
			while (rs.next()){
				cnt++;
				HashMap<String, ByteIterator> values = new HashMap<String, ByteIterator>();
				if (fields != null) {
					for (String field : fields) {
						String value = rs.getString(field);
						if(field.equalsIgnoreCase("userid"))
							field = "userid";
						values.put(field, new ObjectByteIterator(value.getBytes()));
					}
					result.add(values);
				}else{
					//get the number of columns and their names
					//Statement st = conn.createStatement();
					//ResultSet rst = st.executeQuery("SELECT * FROM users");
					ResultSetMetaData md = rs.getMetaData();
					int col = md.getColumnCount();
					for (int i = 1; i <= col; i++){
						String col_name = md.getColumnName(i);
						String value="";
						if(col_name.equalsIgnoreCase("tpic")){
							// Get as a BLOB
							Blob aBlob = rs.getBlob(col_name);
							byte[] allBytesInBlob = aBlob.getBytes(1, (int) aBlob.length());
							if(testMode){
								//dump to file
								try{
									FileOutputStream fos = new FileOutputStream(profileOwnerID+"-"+cnt+"-thumbimage.bmp");
									fos.write(allBytesInBlob);
									fos.close();
								}catch(Exception ex){
								}
							}
							values.put(col_name, new ObjectByteIterator(allBytesInBlob));
						}else{
							value = rs.getString(col_name);
							if(col_name.equalsIgnoreCase("userid")){
								uid = value;
								col_name = "userid";
							}
							values.put(col_name, new ObjectByteIterator(value.getBytes()));
						}	
					}
					//Fetch the thumbnail image from the file system
					if (insertImage && !FSimagePath.equals("") ){
						byte[] thumbImage = GetImageFromFS(uid, false);
						//Get the thumbnail image from the file
						if(testMode){
							//dump to file
							try{
								FileOutputStream fos = new FileOutputStream(profileOwnerID+"-"+cnt+"-thumbimage.bmp");
								fos.write(thumbImage);
								fos.close();
							}catch(Exception ex){
							}
						}
						values.put("tpic", new ObjectByteIterator(thumbImage) );
					}
					result.add(values);
				}
			}
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if (rs != null)
					rs.close();
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}

		return retVal;		
	}

	@Override
	public int viewFriendReq(int profileOwnerID,
			Vector<HashMap<String, ByteIterator>> result,  boolean insertImage, boolean testMode) {

		int retVal = SUCCESS;
		ResultSet rs = null;
		if(profileOwnerID < 0)
			return -1;

		String query = "";
		String uid="";
		
		try {
			if(insertImage && FSimagePath.equals("")){
				query = "SELECT userid, inviterid, inviteeid, username, fname, lname, gender, dob, jdate, ldate, address,email,tel,tpic FROM users, friendship WHERE inviteeid=? and status = 1 and inviterid = userid";
				if((preparedStatement = newCachedStatements.get(GETPENDIMG_STMT)) == null)
					preparedStatement = createAndCacheStatement(GETPENDIMG_STMT, query);
			}else{ 
				query = "SELECT userid, inviterid, inviteeid, username, fname, lname, gender, dob, jdate, ldate, address,email,tel FROM users, friendship WHERE inviteeid=? and status = 1 and inviterid = userid";
				if((preparedStatement = newCachedStatements.get(GETPEND_STMT)) == null)
					preparedStatement = createAndCacheStatement(GETPEND_STMT, query);
			}
			//preparedStatement = conn.prepareStatement(query);
			preparedStatement.setInt(1, profileOwnerID);
			rs = preparedStatement.executeQuery();
			int cnt=0;
			while (rs.next()){
				cnt++;
				HashMap<String, ByteIterator> values = new HashMap<String, ByteIterator>();
				//get the number of columns and their names
				ResultSetMetaData md = rs.getMetaData();
				int col = md.getColumnCount();
				for (int i = 1; i <= col; i++){
					String col_name = md.getColumnName(i);
					String value = "";
					if(col_name.equalsIgnoreCase("tpic")){
						// Get as a BLOB
						Blob aBlob = rs.getBlob(col_name);
						byte[] allBytesInBlob = aBlob.getBytes(1, (int) aBlob.length());
						if(testMode){
							//dump to file
							try{
								FileOutputStream fos = new FileOutputStream(profileOwnerID+"-"+cnt+"-thumbimage.bmp");
								fos.write(allBytesInBlob);
								fos.close();
							}catch(Exception ex){
							}

						}
						values.put(col_name, new ObjectByteIterator(allBytesInBlob));
					}else{
						value = rs.getString(col_name);
						if(col_name.equalsIgnoreCase("userid"))
							col_name = "userid";
						values.put(col_name, new ObjectByteIterator(value.getBytes()));
					}
				}
				if (insertImage && !FSimagePath.equals("") ){
					byte[] thumbImage = GetImageFromFS(uid, false);
					//Get the thumbnail image from the file
					if(testMode){
						//dump to file
						try{
							FileOutputStream fos = new FileOutputStream(profileOwnerID+"-"+cnt+"-thumbimage.bmp");
							fos.write(thumbImage);
							fos.close();
						}catch(Exception ex){
						}
					}
					values.put("tpic", new ObjectByteIterator(thumbImage) );
				}
				result.add(values);
			}
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if (rs != null)
					rs.close();
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}

		return retVal;		
	}

	@Override
	public int acceptFriend(int inviterID, int inviteeID) {

		int retVal = SUCCESS;
		if(inviterID < 0 || inviteeID < 0)
			return -1;
		String query;
		query = "UPDATE friendship SET status = 2 WHERE inviterid=? and inviteeid= ? ";
		try {
			conn.setAutoCommit(false);
			if((preparedStatement = newCachedStatements.get(ACCREQ_STMT)) == null)
				preparedStatement = createAndCacheStatement(ACCREQ_STMT, query);
			//preparedStatement = conn.prepareStatement(query);
			preparedStatement.setInt(1, inviterID);
			preparedStatement.setInt(2, inviteeID);
			preparedStatement.executeUpdate();
			//if(preparedStatement != null ) preparedStatement.close();

			query = "insert into friendship values (?, ?, 2)";
			//preparedStatement = conn.prepareStatement(query);
			if((preparedStatement = newCachedStatements.get(INSFRND_STMT)) == null)
				preparedStatement = createAndCacheStatement(INSFRND_STMT, query);
			
			preparedStatement.setInt(1, inviteeID);
			preparedStatement.setInt(2, inviterID);
			preparedStatement.executeUpdate();
			//if(preparedStatement != null ) preparedStatement.close();
			conn.commit();
			conn.setAutoCommit(true);
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {

				if(preparedStatement != null)	
					preparedStatement.clearParameters();
					//preparedStatement.close();
				conn.setAutoCommit(true);
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}
		return retVal;		
	}

	@Override
	public int rejectFriend(int inviterID, int inviteeID) {
		int retVal = SUCCESS;
		if(inviterID < 0 || inviteeID < 0)
			return -1;

		String query = "DELETE FROM friendship WHERE inviterid=? and inviteeid= ? and status=1";
		try {
			//preparedStatement = conn.prepareStatement(query);
			if((preparedStatement = newCachedStatements.get(REJREQ_STMT)) == null)
				preparedStatement = createAndCacheStatement(REJREQ_STMT, query);
			
			
			preparedStatement.setInt(1, inviterID);
			preparedStatement.setInt(2, inviteeID);
			preparedStatement.executeUpdate();
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}
		return retVal;	
	}

	@Override
	public int CreateFriendship(int memberA, int memberB) {
		int retVal = SUCCESS;
		if(memberA < 0 || memberB < 0)
			return -1;
		try {
			conn.setAutoCommit(false);
			String query = "INSERT INTO friendship values(?,?,2)";
			preparedStatement = conn.prepareStatement(query);
			preparedStatement.setInt(1, memberA);
			preparedStatement.setInt(2, memberB);
			preparedStatement.executeUpdate();
			if(preparedStatement != null)
				preparedStatement.close();
			query = "INSERT INTO friendship values(?,?,2)";
			preparedStatement = conn.prepareStatement(query);
			preparedStatement.setInt(1, memberB);
			preparedStatement.setInt(2, memberA);
			preparedStatement.executeUpdate();
			if(preparedStatement != null)
				preparedStatement.close();
			conn.commit();
			conn.setAutoCommit(true);

		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if(preparedStatement != null)
					preparedStatement.close();
				conn.setAutoCommit(true);
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}
		return retVal;
	}

	@Override
	public int inviteFriend(int inviterID, int inviteeID) {
		int retVal = SUCCESS;
		if(inviterID < 0 || inviteeID < 0)
			return -1;

		String query = "INSERT INTO friendship values(?,?,1)";
		try {
			//preparedStatement = conn.prepareStatement(query);
			if((preparedStatement = newCachedStatements.get(INVFRND_STMT)) == null)
				preparedStatement = createAndCacheStatement(INVFRND_STMT, query);
			
			
			preparedStatement.setInt(1, inviterID);
			preparedStatement.setInt(2, inviteeID);
			preparedStatement.executeUpdate();
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}
		return retVal;
	}

	@Override
	public int thawFriendship(int friendid1, int friendid2){
		int retVal = SUCCESS;
		if(friendid1 < 0 || friendid2 < 0)
			return -1;

		String query = "DELETE FROM friendship WHERE (inviterid=? and inviteeid= ?) OR (inviterid=? and inviteeid= ?) and status=2";
		try {
			//preparedStatement = conn.prepareStatement(query);
			if((preparedStatement = newCachedStatements.get(UNFRNDFRND_STMT)) == null)
				preparedStatement = createAndCacheStatement(UNFRNDFRND_STMT, query);
			
			
			preparedStatement.setInt(1, friendid1);
			preparedStatement.setInt(2, friendid2);
			preparedStatement.setInt(3, friendid2);
			preparedStatement.setInt(4, friendid1);

			preparedStatement.executeUpdate();
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}
		return retVal;
	}

	@Override
	public int viewTopKResources(int requesterID, int profileOwnerID, int k,
			Vector<HashMap<String, ByteIterator>> result) {
		int retVal = SUCCESS;
		ResultSet rs = null;
		if(profileOwnerID < 0 || requesterID < 0 || k < 0)
			return -1;

		String query = "SELECT * FROM resources WHERE walluserid = ? AND rownum <? ORDER BY rid desc";
		try {
			if((preparedStatement = newCachedStatements.get(GETTOPRES_STMT)) == null)
				preparedStatement = createAndCacheStatement(GETTOPRES_STMT, query);
			
			
			//preparedStatement = conn.prepareStatement(query);
			preparedStatement.setInt(1, profileOwnerID);
			preparedStatement.setInt(2, (k+1));
			rs = preparedStatement.executeQuery();
			while (rs.next()){
				HashMap<String, ByteIterator> values = new HashMap<String, ByteIterator>();
				//get the number of columns and their names
				ResultSetMetaData md = rs.getMetaData();
				int col = md.getColumnCount();
				for (int i = 1; i <= col; i++){
					String col_name = md.getColumnName(i);
					String value = rs.getString(col_name);
					if(col_name.equalsIgnoreCase("rid"))
						col_name = "rid";
					else if(col_name.equalsIgnoreCase("walluserid"))
						col_name = "walluserid";
					values.put(col_name, new ObjectByteIterator(value.getBytes()));
				}
				result.add(values);
			}
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if (rs != null)
					rs.close();
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}

		return retVal;		
	}

	public int getCreatedResources(int resourceCreatorID, Vector<HashMap<String, ByteIterator>> result) {
		int retVal = SUCCESS;
		ResultSet rs = null;
		if(resourceCreatorID < 0)
			return -1;

		String query = "SELECT * FROM resources WHERE creatorid = ?";
		try {
			preparedStatement = conn.prepareStatement(query);
			preparedStatement.setInt(1, resourceCreatorID);
			rs = preparedStatement.executeQuery();
			while (rs.next()){
				HashMap<String, ByteIterator> values = new HashMap<String, ByteIterator>();
				//get the number of columns and their names
				ResultSetMetaData md = rs.getMetaData();
				int col = md.getColumnCount();
				for (int i = 1; i <= col; i++){
					String col_name = md.getColumnName(i);
					String value = rs.getString(col_name);
					if(col_name.equalsIgnoreCase("rid"))
						col_name = "rid";
					values.put(col_name, new ObjectByteIterator(value.getBytes()));
				}
				result.add(values);
			}
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if (rs != null)
					rs.close();
				if(preparedStatement != null)
					preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}

		return retVal;		
	}


	@Override
	public int viewCommentOnResource(int requesterID, int profileOwnerID,
			int resourceID, Vector<HashMap<String, ByteIterator>> result) {
		int retVal = SUCCESS;
		ResultSet rs = null;
		if(profileOwnerID < 0 || requesterID < 0 || resourceID < 0)
			return -1;
		String query;
		//get comment cnt
		try {	
			query = "SELECT * FROM manipulation WHERE rid = ?";	
			if((preparedStatement = newCachedStatements.get(GETRESCMT_STMT)) == null)
				preparedStatement = createAndCacheStatement(GETRESCMT_STMT, query);
			
			
			//preparedStatement = conn.prepareStatement(query);
			preparedStatement.setInt(1, resourceID);
			rs = preparedStatement.executeQuery();
			while (rs.next()){
				HashMap<String, ByteIterator> values = new HashMap<String, ByteIterator>();
				//get the number of columns and their names
				ResultSetMetaData md = rs.getMetaData();
				int col = md.getColumnCount();
				for (int i = 1; i <= col; i++){
					String col_name = md.getColumnName(i);
					String value = rs.getString(col_name);
					values.put(col_name, new ObjectByteIterator(value.getBytes()));
				}
				result.add(values);
			}
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if (rs != null)
					rs.close();
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}

		return retVal;		
	}

	@Override
	public int postCommentOnResource(int commentCreatorID, int profileOwnerID,
			int resourceID, HashMap<String, ByteIterator> commentValues) {
		int retVal = SUCCESS;

		if(profileOwnerID < 0 || commentCreatorID < 0 || resourceID < 0)
			return -1;

		String query = "INSERT INTO manipulation(creatorid, rid, modifierid, timestamp, type, content) VALUES (?,?, ?,?,?,?)";
		try {
			//preparedStatement = conn.prepareStatement(query);
			if((preparedStatement = newCachedStatements.get(POSTCMT_STMT)) == null)
				preparedStatement = createAndCacheStatement(POSTCMT_STMT, query);
			
			
			preparedStatement.setInt(1, profileOwnerID);
			preparedStatement.setInt(2, resourceID);
			preparedStatement.setInt(3,commentCreatorID);
			preparedStatement.setString(4,commentValues.get("timestamp").toString());
			preparedStatement.setString(5,commentValues.get("type").toString());
			preparedStatement.setString(6,commentValues.get("content").toString());
		
			preparedStatement.executeUpdate();
		}catch(SQLException sx){
			retVal = -2;
			sx.printStackTrace(System.out);
		}finally{
			try {
				if(preparedStatement != null)
					preparedStatement.clearParameters();
					//preparedStatement.close();
			} catch (SQLException e) {
				retVal = -2;
				e.printStackTrace(System.out);
			}
		}

		return retVal;		
	}

	@Override
	public HashMap<String, String> getInitialStats() {
		HashMap<String, String> stats = new HashMap<String, String>();
		Statement st = null;
		ResultSet rs = null;
		String query = "";
		try {
			st = conn.createStatement();
			//get user count
			query = "SELECT count(*) from users";
			rs = st.executeQuery(query);
			if(rs.next()){
				stats.put("usercount",rs.getString(1));
			}else
				stats.put("usercount","0"); //sth is wrong - schema is missing
			rs.close();
			//get user offset
			query = "SELECT min(userid) from users";
			rs = st.executeQuery(query);
			String offset = "0";
			if(rs.next()){
				offset = rs.getString(1);
			}
			rs.close();
			//get resources per user
			query = "SELECT count(*) from resources where creatorid="+Integer.parseInt(offset);
			rs = st.executeQuery(query);
			if(rs.next()){
				stats.put("resourcesperuser",rs.getString(1));
			}else{
				stats.put("resourcesperuser","0");
			}
			rs.close();
			//get number of friends per user
			query = "select count(*) from friendship where inviteeid="+Integer.parseInt(offset) +" AND status=2" ;
			rs = st.executeQuery(query);
			if(rs.next()){
				stats.put("avgfriendsperuser",rs.getString(1));
			}else
				stats.put("avgfriendsperuser","0");
			if(rs != null) rs.close();
			
			query = "select count(*) from friendship where (inviteeid="+Integer.parseInt(offset) +") AND status=1" ;
			rs = st.executeQuery(query);
			if(rs.next()){
				stats.put("avgpendingperuser",rs.getString(1));
			}else
				stats.put("avgpendingperuser","0");
			

		}catch(SQLException sx){
			sx.printStackTrace(System.out);
		}finally{
			try {
				if(rs != null)
					rs.close();
				if(st != null)
					st.close();
			} catch (SQLException e) {
				e.printStackTrace(System.out);
			}

		}
		return stats;
	}

	public int queryPendingFriendshipIds(int inviteeid, Vector<Integer> pendingIds){
		Statement st = null;
		ResultSet rs = null;
		String query = "";
		try {
			st = conn.createStatement();
			query = "SELECT inviterid from friendship where inviteeid='"+inviteeid+"' and status='1'";
			rs = st.executeQuery(query);
			while(rs.next()){
				pendingIds.add(rs.getInt(1));
			}	
		}catch(SQLException sx){
			sx.printStackTrace(System.out);
		}finally{
			try {
				if(rs != null)
					rs.close();
				if(st != null)
					st.close();
			} catch (SQLException e) {
				e.printStackTrace(System.out);
				return -2;
			}
		}
		return 0;
	}


	public int queryConfirmedFriendshipIds(int profileId, Vector<Integer> confirmedIds){
		Statement st = null;
		ResultSet rs = null;
		String query = "";
		try {
			st = conn.createStatement();
			query = "SELECT inviteeid from friendship where inviterid="+profileId+" and status='2'";
			rs = st.executeQuery(query);
			while(rs.next()){
				confirmedIds.add(rs.getInt(1));
			}	
		}catch(SQLException sx){
			sx.printStackTrace(System.out);
		}finally{
			try {
				if(rs != null)
					rs.close();
				if(st != null)
					st.close();
			} catch (SQLException e) {
				e.printStackTrace(System.out);
				return -2;
			}
		}
		return 0;

	}

	public void createSchema(Properties props){

		Statement stmt = null;

		try {
			stmt = conn.createStatement();

			dropSequence(stmt, "MIDINC");
			dropSequence(stmt, "RIDINC");
			dropSequence(stmt, "USERIDINC");
			dropSequence(stmt, "USERIDS");

			dropTable(stmt, "friendship");
			dropTable(stmt, "manipulation");
			dropTable(stmt, "resources");
			dropTable(stmt, "users");

			stmt.executeUpdate("CREATE SEQUENCE  MIDINC  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 201 CACHE 20 NOORDER  NOCYCLE");
			stmt.executeUpdate("CREATE SEQUENCE  RIDINC  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 21 CACHE 20 NOORDER  NOCYCLE ");
			stmt.executeUpdate("CREATE SEQUENCE  USERIDINC  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 21 CACHE 20 NOORDER  NOCYCLE ");
			stmt.executeUpdate("CREATE SEQUENCE  USERIDS  MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE");

			stmt.executeUpdate("CREATE TABLE FRIENDSHIP"
					+ "(INVITERID NUMBER, INVITEEID NUMBER,"
					+ "STATUS NUMBER DEFAULT 1" + ") NOLOGGING");

			stmt.executeUpdate("CREATE TABLE MANIPULATION"
					+ "(	MID NUMBER," + "CREATORID NUMBER, RID NUMBER,"
					+ "MODIFIERID NUMBER, TIMESTAMP VARCHAR2(200),"
					+ "TYPE VARCHAR2(200), CONTENT VARCHAR2(200)"
					+ ") NOLOGGING");

			stmt.executeUpdate("CREATE TABLE RESOURCES"
					+ "(	RID NUMBER,CREATORID NUMBER,"
					+ "WALLUSERID NUMBER, TYPE VARCHAR2(200),"
					+ "BODY VARCHAR2(200), DOC VARCHAR2(200)"
					+ ") NOLOGGING");
			
			if (Boolean.parseBoolean(props.getProperty(Client.INSERT_IMAGE_PROPERTY,
					Client.INSERT_IMAGE_PROPERTY_DEFAULT)) && props.getProperty(FS_PATH, "").equals("")) {
				stmt.executeUpdate("CREATE TABLE USERS"
						+ "(USERID NUMBER, USERNAME VARCHAR2(200), "
						+ "PW VARCHAR2(200), FNAME VARCHAR2(200), "
						+ "LNAME VARCHAR2(200), GENDER VARCHAR2(200),"
						+ "DOB VARCHAR2(200),JDATE VARCHAR2(200), "
						+ "LDATE VARCHAR2(200), ADDRESS VARCHAR2(200),"
						+ "EMAIL VARCHAR2(200), TEL VARCHAR2(200), PIC BLOB, TPIC BLOB"
						+ ") NOLOGGING");
			} else {
				stmt.executeUpdate("CREATE TABLE USERS"
						+ "(USERID NUMBER, USERNAME VARCHAR2(200), "
						+ "PW VARCHAR2(200), FNAME VARCHAR2(200), "
						+ "LNAME VARCHAR2(200), GENDER VARCHAR2(200),"
						+ "DOB VARCHAR2(200),JDATE VARCHAR2(200), "
						+ "LDATE VARCHAR2(200), ADDRESS VARCHAR2(200),"
						+ "EMAIL VARCHAR2(200), TEL VARCHAR2(200)"
						+ ") NOLOGGING");

			}

			stmt.executeUpdate("ALTER TABLE USERS MODIFY (USERID NOT NULL ENABLE)");
			stmt.executeUpdate("ALTER TABLE USERS ADD CONSTRAINT USERS_PK PRIMARY KEY (USERID) ENABLE");
			stmt.executeUpdate("ALTER TABLE MANIPULATION ADD CONSTRAINT MANIPULATION_PK PRIMARY KEY (MID) ENABLE");
			stmt.executeUpdate("ALTER TABLE MANIPULATION MODIFY (MID NOT NULL ENABLE)");
			stmt.executeUpdate("ALTER TABLE MANIPULATION MODIFY (CREATORID NOT NULL ENABLE)");
			stmt.executeUpdate("ALTER TABLE MANIPULATION MODIFY (RID NOT NULL ENABLE)");
			stmt.executeUpdate("ALTER TABLE MANIPULATION MODIFY (MODIFIERID NOT NULL ENABLE)");
			stmt.executeUpdate("ALTER TABLE FRIENDSHIP ADD CONSTRAINT FRIENDSHIP_PK PRIMARY KEY (INVITERID, INVITEEID) ENABLE");
			stmt.executeUpdate("ALTER TABLE FRIENDSHIP MODIFY (INVITERID NOT NULL ENABLE)");
			stmt.executeUpdate("ALTER TABLE FRIENDSHIP MODIFY (INVITEEID NOT NULL ENABLE)");
			stmt.executeUpdate("ALTER TABLE RESOURCES ADD CONSTRAINT RESOURCES_PK PRIMARY KEY (RID) ENABLE");
			stmt.executeUpdate("ALTER TABLE RESOURCES MODIFY (RID NOT NULL ENABLE)");
			stmt.executeUpdate("ALTER TABLE RESOURCES MODIFY (CREATORID NOT NULL ENABLE)");
			stmt.executeUpdate("ALTER TABLE RESOURCES MODIFY (WALLUSERID NOT NULL ENABLE)");
			stmt.executeUpdate("ALTER TABLE FRIENDSHIP ADD CONSTRAINT FRIENDSHIP_USERS_FK1 FOREIGN KEY (INVITERID)"
					+ "REFERENCES USERS (USERID) ON DELETE CASCADE ENABLE");
			stmt.executeUpdate("ALTER TABLE FRIENDSHIP ADD CONSTRAINT FRIENDSHIP_USERS_FK2 FOREIGN KEY (INVITEEID)"
					+ "REFERENCES USERS (USERID) ON DELETE CASCADE ENABLE");
			stmt.executeUpdate("ALTER TABLE MANIPULATION ADD CONSTRAINT MANIPULATION_RESOURCES_FK1 FOREIGN KEY (RID)"
					+ "REFERENCES RESOURCES (RID) ON DELETE CASCADE ENABLE");
			stmt.executeUpdate("ALTER TABLE MANIPULATION ADD CONSTRAINT MANIPULATION_USERS_FK1 FOREIGN KEY (CREATORID)"
					+ "REFERENCES USERS (USERID) ON DELETE CASCADE ENABLE");
			stmt.executeUpdate("ALTER TABLE MANIPULATION ADD CONSTRAINT MANIPULATION_USERS_FK2 FOREIGN KEY (MODIFIERID)"
					+ "REFERENCES USERS (USERID) ON DELETE CASCADE ENABLE");
			stmt.executeUpdate("ALTER TABLE RESOURCES ADD CONSTRAINT RESOURCES_USERS_FK1 FOREIGN KEY (CREATORID)"
					+ "REFERENCES USERS (USERID) ON DELETE CASCADE ENABLE");
			stmt.executeUpdate("ALTER TABLE RESOURCES ADD CONSTRAINT RESOURCES_USERS_FK2 FOREIGN KEY (WALLUSERID)"
					+ "REFERENCES USERS (USERID) ON DELETE CASCADE ENABLE");
			stmt.executeUpdate("CREATE OR REPLACE TRIGGER MINC before insert on manipulation "
					+ "for each row "
					+ "WHEN (new.mid is null) begin "
					+ "select midInc.nextval into :new.mid from dual;"
					+ "end;");
			stmt.executeUpdate("ALTER TRIGGER MINC ENABLE");

			stmt.executeUpdate("CREATE OR REPLACE TRIGGER RINC before insert on resources "
					+ "for each row "
					+ "WHEN (new.rid is null) begin "
					+ "select ridInc.nextval into :new.rid from dual;"
					+ "end;");
			stmt.executeUpdate("ALTER TRIGGER RINC ENABLE");

			stmt.executeUpdate("CREATE OR REPLACE TRIGGER UINC before insert on users "
					+ "for each row "
					+ "WHEN (new.userid is null) begin "
					+ "select useridInc.nextval into :new.userid from dual;"
					+ "end;");
			stmt.executeUpdate("ALTER TRIGGER UINC ENABLE");
			
			
			//build indexes
			dropIndex(stmt, "RESOURCE_CREATORID");
			dropIndex(stmt, "RESOURCES_WALLUSERID");
			dropIndex(stmt, "FRIENDSHIP_INVITEEID");
			dropIndex(stmt, "FRIENDSHIP_INVITERID");
			dropIndex(stmt, "MANIPULATION_RID");
			dropIndex(stmt, "MANIPULATION_CREATORID");
			stmt.executeUpdate("CREATE INDEX RESOURCE_CREATORID ON RESOURCES (CREATORID)"
					+ "COMPUTE STATISTICS NOLOGGING");

			stmt.executeUpdate("CREATE INDEX FRIENDSHIP_INVITEEID ON FRIENDSHIP (INVITEEID)"
					+ "COMPUTE STATISTICS NOLOGGING");

			stmt.executeUpdate("CREATE INDEX MANIPULATION_RID ON MANIPULATION (RID)"
					+ "COMPUTE STATISTICS NOLOGGING");

			stmt.executeUpdate("CREATE INDEX RESOURCES_WALLUSERID ON RESOURCES (WALLUSERID)"
					+ "COMPUTE STATISTICS NOLOGGING");

			stmt.executeUpdate("CREATE INDEX FRIENDSHIP_INVITERID ON FRIENDSHIP (INVITERID)"
					+ "COMPUTE STATISTICS NOLOGGING");

			stmt.executeUpdate("CREATE INDEX MANIPULATION_CREATORID ON MANIPULATION (CREATORID)"
					+ "COMPUTE STATISTICS NOLOGGING");

		} catch (SQLException e) {
			e.printStackTrace(System.out);
		} finally {
			if (stmt != null)
				try {
					stmt.close();
				} catch (SQLException e) {
					e.printStackTrace(System.out);
				}
		}

	}

	public void buildIndexes() {
		Statement stmt  = null;
		try {
			stmt = conn.createStatement();
			long startIdx = System.currentTimeMillis();

			/*dropIndex(stmt, "RESOURCE_CREATORID");
			dropIndex(stmt, "RESOURCES_WALLUSERID");
			dropIndex(stmt, "FRIENDSHIP_INVITEEID");
			dropIndex(stmt, "FRIENDSHIP_INVITERID");
			dropIndex(stmt, "MANIPULATION_RID");
			dropIndex(stmt, "MANIPULATION_CREATORID");
			stmt.executeUpdate("CREATE INDEX RESOURCE_CREATORID ON RESOURCES (CREATORID)"
					+ "COMPUTE STATISTICS NOLOGGING");

			stmt.executeUpdate("CREATE INDEX FRIENDSHIP_INVITEEID ON FRIENDSHIP (INVITEEID)"
					+ "COMPUTE STATISTICS NOLOGGING");

			stmt.executeUpdate("CREATE INDEX MANIPULATION_RID ON MANIPULATION (RID)"
					+ "COMPUTE STATISTICS NOLOGGING");

			stmt.executeUpdate("CREATE INDEX RESOURCES_WALLUSERID ON RESOURCES (WALLUSERID)"
					+ "COMPUTE STATISTICS NOLOGGING");

			stmt.executeUpdate("CREATE INDEX FRIENDSHIP_INVITERID ON FRIENDSHIP (INVITERID)"
					+ "COMPUTE STATISTICS NOLOGGING");

			stmt.executeUpdate("CREATE INDEX MANIPULATION_CREATORID ON MANIPULATION (CREATORID)"
					+ "COMPUTE STATISTICS NOLOGGING");
					*/

			stmt.executeUpdate("analyze table users compute statistics");
			stmt.executeUpdate("analyze table resources compute statistics");
			stmt.executeUpdate("analyze table friendship compute statistics");
			stmt.executeUpdate("analyze table manipulation compute statistics");
			long endIdx = System.currentTimeMillis();
			System.out
			.println("Time to build database index structures(ms):"
					+ (endIdx - startIdx));
		} catch (Exception e) {
			e.printStackTrace(System.out);
		} finally {
			try {
				if (stmt != null)
					stmt.close();
			} catch (SQLException e) {
				e.printStackTrace(System.out);
			}
		}
	}

	public static void dropSequence(Statement st, String seqName) {
		try {
			st.executeUpdate("drop sequence " + seqName);
		} catch (SQLException e) {
		}
	}

	public static void dropIndex(Statement st, String idxName) {
		try {
			st.executeUpdate("drop index " + idxName);
		} catch (SQLException e) {
		}
	}

	public static void dropTable(Statement st, String tableName) {
		try {
			st.executeUpdate("drop table " + tableName);
		} catch (SQLException e) {
		}
	}


}