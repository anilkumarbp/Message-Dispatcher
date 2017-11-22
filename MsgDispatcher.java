import java.io.IOException;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.log4j.Logger;

public final class MsgDispatcher extends HttpServlet
{

  Logger logger = Logger.getLogger(MsgDispatcher.class);

  public void doPost(HttpServletRequest paramHttpServletRequest, HttpServletResponse paramHttpServletResponse)
    throws ServletException, IOException
  {
    post(paramHttpServletRequest, paramHttpServletResponse);
  }

  public void doGet(HttpServletRequest paramHttpServletRequest, HttpServletResponse paramHttpServletResponse)
    throws ServletException, IOException
  { 
    post(paramHttpServletRequest, paramHttpServletResponse);
  }

  public void init(ServletConfig paramServletConfig)
    throws ServletException
  {
    super.init(paramServletConfig);
  }

  public void service(ServletRequest paramServletRequest, ServletResponse paramServletResponse)
    throws ServletException, IOException
  {
    super.service(paramServletRequest, paramServletResponse);
  }

  private void post(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  { response.setHeader("Access-Control-Allow-Origin", "*"); 
	request.setCharacterEncoding("UTF-8");
    MsgContext msgContext = new MsgContext(request, response, getServletContext());
    msgContext.getResponse().setHeader("Cache-Control", "no-cache");
    msgContext.getResponse().setDateHeader("Expires", 0L);
    try
    {
      IMsgHandler iMsgHandler = msgContext.getHandler();
      if (iMsgHandler!=null)
      { iMsgHandler.handleMsgofSubmit(msgContext);
      }
      else
      {   
    	  
    	   if (!msgContext.getOpt().equals("count") && msgContext.getHandlerClass()!=null) 
    		 {
    		 
    		 iMsgHandler= new DefaultHdr();
    		 iMsgHandler.handleMsgofSubmit(msgContext);
    		 }
    	 }
    }
    catch (Exception e)
    {
    this.logger.error(e);
    }
  }

 
}
