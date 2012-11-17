import javax.servlet.*;
import javax.servlet.http.*;

import net.sf.json.JSONObject;

import java.io.*;
import java.util.*;

public class TestingServlet extends HttpServlet {

	private String classpathParamters = "";
	private String bgJarlocation = "";
	private String datStoreJarlocation = "";
	private String ycsbClientlocation = "";
	private String commandType = "";
	private String clientClass = "";
	private String bgLocation = "";

	public void init(ServletConfig config) throws ServletException {
		super.init(config);
		ServletContext context = getServletContext();
		classpathParamters = context.getInitParameter("classpathParamters");
		bgLocation = context.getInitParameter("bgLocation");
	}

	public void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {

		response.setContentType("text/html");
		PrintWriter out = response.getWriter();
		// String button = request.getParameter("click_event");
		String paramterString = null;

		clientClass = request.getParameter("clientval");
		String button = request.getParameter("Button");

		if (button.equals("testDataStoreButton")) {
			paramterString = request.getParameter("testDataStore");
			commandType = "-testdb -db";
			String cmd = TestConnectionString(paramterString, commandType);
			boolean status = testDB(cmd);
			if (status)
				out.print("OK");
			else
				out.print("FAIL");

			// out.print(status);
		} else if (button.equals("populateDataStoreButton")) {
			paramterString = request.getParameter("DataStoreParam");
			String userPropList = request.getParameter("testDataStore");
			commandType = "-load -db";
			// out.write(userPropList);
			String cmd = loadData(paramterString, userPropList, commandType);
			// out.write(cmd+"   prps   ");
			// out.write(userPropList);

			populateDB(cmd, out);

			// out.close();

		} else if (button.equals("CreateSchemaButton")) {
			commandType = "-schema -db";
			paramterString = request.getParameter("testDataStore");
			String cmd = TestConnectionString(paramterString, commandType);
			boolean status = testDB(cmd);
			if (status)
				out.print("OK");
			else
				out.print("FAIL");

		}
		// Madhu#110712 : Start
		else if (button.equals("queryDataStore")) {
			System.out.println("QueryDataStore");
			commandType = "-stats -db";
			paramterString = request.getParameter("testDataStore");
			String cmd = TestConnectionString(paramterString, commandType);
			String reply = queryData(cmd);
			out.print(reply);

			// Madhu#110712 : End

		}

	}

	private String queryData(String cmd) {
		Runtime run = Runtime.getRuntime();
		Process pr = null;
		StringBuffer buffer = new StringBuffer("");
		try {
			pr = run.exec(cmd);
		} catch (IOException e1) {
			// TODO Auto-generated catch block
			System.out.println(e1);
			// return false;
		}
		try {
			pr.waitFor();
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			System.out.println(e);
			// return false;
		}
		BufferedReader buf = new BufferedReader(new InputStreamReader(
				pr.getInputStream()));
		String line = "";
		try {
			while ((line = buf.readLine()) != null) {
				// out.println(line);
				buffer.append(line);

			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			System.out.println(e);
			// return false;
		}
		return buffer.toString();
	}

	private void populateDB(String cmd, PrintWriter out) {

		String buffer = new String();
		try {
			Runtime run = Runtime.getRuntime();
			Process pr = null;

			try {
				pr = run.exec(cmd);
				BufferedReader buf = new BufferedReader(new InputStreamReader(
						pr.getInputStream()));
				String line = "";
				while ((line = buf.readLine()) != null) {
					out.println(line);
					out.println();

				}
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}

			try {
				pr.waitFor();
			} catch (InterruptedException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}

		} catch (Exception e) {
			e.printStackTrace();
		}

	}

	private String loadData(String paramterString, String userPropList,
			String commandType3) {
		String delimiter = ";";
		String space = " ";
		String cmdText = commandType;
		String propDelimter = "-p";
		String wrkLoadDelim = "-P";
		String filePath = null;

		// create a command string
		String executeCommand = "java  -Xmx1G -cp";
		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(classpathParamters);
		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(cmdText);
		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(clientClass);

		// if no parameters are present return
		if (paramterString == null)
			return executeCommand;

		String[] array = paramterString.split(";");

		// Read from user entered parameters

		try {
			// Create file
			FileWriter fstream = new FileWriter(bgLocation + "/populateDB.txt");
			BufferedWriter out = new BufferedWriter(fstream);

			out.write("# This is the workload for the user table.\n\n");
			out.write("# Fields for populating the user table.\n");

			for (int index = 0; index < array.length; index++) {

				out.write(array[index] + "\n");

			}
			out.write("userworkload=edu.usc.bg.workloads.UserWorkload\n");
			out.write("friendshipworkload=edu.usc.bg.workloads.FriendshipWorkload\n");
			out.write("resourceworkload=edu.usc.bg.workloads.ResourceWorkload\n");
			out.write("manipulationworkload=edu.usc.bg.workloads.ManipulationWorkload)\n");
			out.close();
		} catch (Exception e) {// Catch exception if any
		}

		filePath = bgLocation + "\\populateDB.txt";

		// Append the user input parameters to command string
		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(wrkLoadDelim);
		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(filePath);
		// executeCommand = executeCommand.concat(commandStr);

		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(propDelimter);
		executeCommand = executeCommand.concat(space);

		String commandStr = "";
		String[] propArray = userPropList.split(";");
		System.out.println(userPropList);
		for (int index = 0; index < propArray.length; index++) {
			commandStr = commandStr.concat(propArray[index]);
			commandStr = commandStr.concat(space);

			if (index != propArray.length - 1)
				commandStr = commandStr.concat(propDelimter);

			commandStr = commandStr.concat(space);
		}
		System.out.println(executeCommand);
		// Append the user input parameters to command string
		executeCommand = executeCommand.concat(commandStr);
		System.out.println(executeCommand);
		return executeCommand;

		// System.out.println(commandStr);
		// out.println(commandStr);
	}

	boolean testDB(String cmd) {

		Runtime run = Runtime.getRuntime();
		Process pr = null;
		StringBuffer buffer = new StringBuffer("");
		try {
			pr = run.exec(cmd);
		} catch (IOException e1) {
			// TODO Auto-generated catch block
			System.out.println(e1);
			// return false;
		}
		try {
			pr.waitFor();
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			System.out.println(e);
			// return false;
		}
		BufferedReader buf = new BufferedReader(new InputStreamReader(
				pr.getInputStream()));
		String line = "";
		try {
			while ((line = buf.readLine()) != null) {
				// out.println(line);
				buffer.append(line);

			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			System.out.println(e);
			// return false;
		}
		return true;

	}

	String TestConnectionString(String paramterString, String commandType) {

		String delimiter = ";";
		String space = " ";
		String cmdText = commandType;
		String propDelimter = "-p";

		// create a command string
		String executeCommand = "java  -Xmx1G -cp";
		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(classpathParamters);
		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(cmdText);
		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(clientClass);

		// if no parameters are present return
		if (paramterString == null)
			return executeCommand;

		executeCommand = executeCommand.concat(space);
		executeCommand = executeCommand.concat(propDelimter);
		executeCommand = executeCommand.concat(space);

		String[] array = paramterString.split(";");

		// Read from user entered parameters
		String commandStr = "";
		for (int index = 0; index < array.length; index++) {
			commandStr = commandStr.concat(array[index]);
			commandStr = commandStr.concat(space);

			if (index != array.length - 1)
				commandStr = commandStr.concat(propDelimter);

			commandStr = commandStr.concat(space);
		}

		// Append the user input parameters to command string
		executeCommand = executeCommand.concat(commandStr);
		return executeCommand;

	}

}