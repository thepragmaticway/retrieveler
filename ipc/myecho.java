public class myecho {
  public static void main(String[] args) {
    //Read input form system.in if no argument is provided
    if (args.length == 0) {
      try {
      
        byte[] buffer = new byte[1024];
        int bytesRead = System.in.read(buffer);
        String input = new String(buffer, 0, bytesRead); 
        //System.out.println(input + " " + bytesRead + " bytes read");
      } catch (Exception e) {
        e.printStackTrace();
      }
    } else {
      System.out.println(args[0]);
    }
  }
}
