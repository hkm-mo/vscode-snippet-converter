<!--#snippet0 prefix="test"-->
<template>
    <!-- This is a normal comment -->
    <div>
        <!--#snippet1 
            description="This is a &quot;description&quot;!!:)" 
            prefix="my-div,m-div"
            -->
        <div>
            <!--#snippet2a
                prefix="my-span"
                placeholder-1="Test Abc"
                -->
            <span>
                Test Abc
                <!--#snippet2b 
                prefix="my-span-b" 
                alone
                placeholder-1="Test Abc"
                -->
                <code>!</code>
                <!--/#-->
            </span>
            <!--/#-->
            <!--#snippet3
                prefix="my-span-new"
                placeholder-1="Test Abc"
                -->
            <span class="new">Test Abc</span>
            <!--/#-->
        </div>
        <!--/#-->
    </div>
</template>

<script>
</script>

<style></style>
<!--/#-->