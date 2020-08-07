/* global $*/
$(document).ready(function() {
    //Global variables------------------------------
    
    //Event handlers------s--------------------------
    
    //Functions-------------------------------------

    $("#reservation").on("change", function() {
        // let value =  $("#reservation").val();
        $.ajax({
            method: "post",
            url: "/api/getReservation",
            data: {
            },
            success: function(result, status) {
                
                // $("#reservation-info").html("");
                // let htmlString = "";
                
                // htmlString += "<div class='form-group'><label for='flight_num'>Flight Number: </label><input type='text' class='form-control' id='flight_num' value='" + result[0].flight_num + "' readonly></div>"
                
                // $("#reservation-info").append(htmlString);
            }
        });
    });
});//ready