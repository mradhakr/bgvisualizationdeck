<!--contents of download.jsp-->
<%@ page import="java.util.*,java.io.*"%>
<!--Assumes that file name is in the request objects query Parameter -->
<%
	//read the file name.
	File f = new File ("C:/Program Files/Apache Software Foundation/Tomcat 6.0/webapps/bg/files/workloadParameters.txt");
	//set the content type(can be excel/word/powerpoint etc..)
	response.setContentType ("application/octet-stream");
	//set the header and also the Name by which user will be prompted to save
	response.setHeader ("Content-Disposition", "attachment;filename=\"NewWorkloadParameters.txt\"");
	
	//get the file name
	String name = f.getName().substring(f.getName().lastIndexOf("/") + 1,f.getName().length());
	//OPen an input stream to the file and post the file contents thru the 
	//servlet output stream to the client m/c
	
		InputStream in = new FileInputStream(f);
		ServletOutputStream outs = response.getOutputStream();
		
		
		int bit = 256;
		int i = 0;
		try {
			while ((bit) >= 0) {
				bit = in.read();
				outs.write(bit);
			}
		} catch (IOException ioe) {
			ioe.printStackTrace(System.out);
		}
		outs.flush();
		outs.close();
		in.close();	
%>
